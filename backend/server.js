require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'ventoedu_dev_secret';

/* ══════════════════════════════════════════════════
   MIDDLEWARE
══════════════════════════════════════════════════ */
app.use(cors({
    origin: '*', // Por ahora usa '*' para que Netlify pueda conectarse sin problemas
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' })); // face descriptors son arrays grandes

/* ══════════════════════════════════════════════════
   FIREBASE ADMIN (base de datos en la nube)
══════════════════════════════════════════════════ */
let serviceAccount;
try {
    // MODO BASE64 PARA RAILWAY (Infalible)
    if (process.env.FIREBASE_BASE64) {
        const decodedText = Buffer.from(process.env.FIREBASE_BASE64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decodedText);
    }
    // Fallback por si acaso
    else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let envJson = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        if (envJson.startsWith("'") && envJson.endsWith("'")) envJson = envJson.slice(1, -1);
        serviceAccount = JSON.parse(envJson);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
    }
    // Para tu computadora (localhost)
    else {
        serviceAccount = require('./serviceAccountKey.json');
    }
} catch (error) {
    console.error("🚨 ERROR CRÍTICO AL LEER CREDENCIALES DE FIREBASE:", error.message);
    process.exit(1); // Crash si no hay credenciales
}

if (!serviceAccount || !serviceAccount.project_id) {
    console.error("🚨 ERROR: serviceAccount es inválido o está vacío.");
    process.exit(1);
}

console.log("✅ Firebase Credentials cargadas para el proyecto:", serviceAccount.project_id);


admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ══════════════════════════════════════════════════
   GOOGLE AUTH CLIENT
══════════════════════════════════════════════════ */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ══════════════════════════════════════════════════
   MIDDLEWARE: verificar JWT
══════════════════════════════════════════════════ */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
const findUserByEmail = async (email) => {
    const snap = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

const signToken = (user) => jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '7d' }
);

/* ══════════════════════════════════════════════════
   1) REGISTRO CON CORREO Y CONTRASEÑA
   POST /api/register
══════════════════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    if (password.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    try {
        const existing = await findUserByEmail(email);
        if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const ref = await db.collection('users').add({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            google_id: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const user = { id: ref.id, name: name.trim(), email: email.toLowerCase().trim() };
        const token = signToken(user);
        res.status(201).json({ message: 'Usuario creado', token, user });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/* ══════════════════════════════════════════════════
   2) LOGIN CON CORREO Y CONTRASEÑA
   POST /api/login
══════════════════════════════════════════════════ */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    try {
        const user = await findUserByEmail(email);

        if (!user) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        if (!user.password) return res.status(401).json({ error: 'Esta cuenta usa Google. Inicia sesión con Google.' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

        await db.collection('users').doc(user.id).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            loginCount: admin.firestore.FieldValue.increment(1),
        });

        const token = signToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'student',
                method: 'email',
                progress: user.progress || {},
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/* ══════════════════════════════════════════════════
   3) LOGIN CON GOOGLE
   POST /api/google-login
══════════════════════════════════════════════════ */
app.post('/api/google-login', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Credencial de Google requerida' });

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub: google_id, email, name } = ticket.getPayload();

        let user = await findUserByEmail(email);

        if (!user) {
            const ref = await db.collection('users').add({
                name, email: email.toLowerCase(),
                password: null,
                google_id,
                role: 'student',
                progress: {},
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            user = { id: ref.id, name, email, role: 'student', progress: {} };
        }

        await db.collection('users').doc(user.id).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            loginCount: admin.firestore.FieldValue.increment(1),
        }).catch(() => { });

        const token = signToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'student',
                method: 'google',
                progress: user.progress || {},
            },
        });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(401).json({ error: 'Token de Google inválido' });
    }
});

/* ══════════════════════════════════════════════════
   4) GUARDAR PERFIL FACIAL
   POST /api/face-profile
══════════════════════════════════════════════════ */
app.post('/api/face-profile', async (req, res) => {
    const { name, email, descriptor } = req.body;
    if (!name || !email || !descriptor || !Array.isArray(descriptor))
        return res.status(400).json({ error: 'Datos incompletos' });

    try {
        const emailLow = email.toLowerCase().trim();

        let userId = null;
        let existingUser = await findUserByEmail(emailLow);
        if (!existingUser) {
            const ref = await db.collection('users').add({
                name: name.trim(),
                email: emailLow,
                password: null,
                google_id: null,
                method: 'face',
                role: 'student',
                progress: {},
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            userId = ref.id;
        } else {
            userId = existingUser.id;
        }

        const existing = await db.collection('face_profiles')
            .where('email', '==', emailLow).get();

        if (!existing.empty) {
            const docId = existing.docs[0].id;
            await db.collection('face_profiles').doc(docId).update({
                name, descriptor,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.json({ message: 'Perfil facial actualizado', id: docId, userId });
        }

        const ref = await db.collection('face_profiles').add({
            name: name.trim(),
            email: emailLow,
            descriptor,
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({ message: 'Perfil facial guardado', id: ref.id, userId });
    } catch (err) {
        console.error('Face profile error:', err);
        res.status(500).json({ error: 'Error al guardar perfil facial' });
    }
});

/* ══════════════════════════════════════════════════
   4b) BUSCAR USUARIO POR EMAIL (Para Face ID)
   GET /api/user-by-email
══════════════════════════════════════════════════ */
app.get('/api/user-by-email', async (req, res) => {
    const { email, autoCreateName } = req.query;
    if (!email) return res.status(400).json({ error: 'email requerido' });
    try {
        const emailLow = email.toLowerCase().trim();
        let user = await findUserByEmail(emailLow);

        if (!user && autoCreateName) {
            const ref = await db.collection('users').add({
                name: autoCreateName.trim(),
                email: emailLow,
                password: null,
                google_id: null,
                method: 'face',
                role: 'student',
                progress: {},
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            user = { id: ref.id, name: autoCreateName.trim(), email: emailLow, role: 'student', progress: {}, method: 'face' };
        } else if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'student',
            progress: user.progress || {},
            method: user.method || (user.google_id ? 'google' : user.password ? 'email' : 'face'),
        });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
});

/* ══════════════════════════════════════════════════
   5) OBTENER TODOS LOS PERFILES FACIALES
   GET /api/face-profiles
══════════════════════════════════════════════════ */
app.get('/api/face-profiles', async (req, res) => {
    try {
        const snap = await db.collection('face_profiles').get();
        const profiles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ profiles });
    } catch (err) {
        console.error('Get profiles error:', err);
        res.status(500).json({ error: 'Error al obtener perfiles' });
    }
});

/* ══════════════════════════════════════════════════
   6) ELIMINAR PERFIL FACIAL
   DELETE /api/face-profile/:id
══════════════════════════════════════════════════ */
app.delete('/api/face-profile/:id', verifyToken, async (req, res) => {
    try {
        await db.collection('face_profiles').doc(req.params.id).delete();
        res.json({ message: 'Perfil facial eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar perfil' });
    }
});

/* ══════════════════════════════════════════════════
   7) VERIFICAR TOKEN
   GET /api/verify
══════════════════════════════════════════════════ */
app.get('/api/verify', verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

/* ══════════════════════════════════════════════════
   8) GUARDAR PROGRESO DEL USUARIO
   PUT /api/progress/:userId
══════════════════════════════════════════════════ */
app.put('/api/progress/:userId', async (req, res) => {
    const { userId } = req.params;
    const { module, data } = req.body;
    if (!module || !data) return res.status(400).json({ error: 'module y data son requeridos' });

    try {
        await db.collection('users').doc(userId).update({
            [`progress.${module}`]: data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ ok: true, message: 'Progreso guardado' });
    } catch (err) {
        console.error('Progress save error:', err);
        res.status(500).json({ error: 'Error al guardar progreso' });
    }
});

/* ══════════════════════════════════════════════════
   9) CARGAR PROGRESO DEL USUARIO
   GET /api/progress/:userId
══════════════════════════════════════════════════ */
app.get('/api/progress/:userId', async (req, res) => {
    try {
        const doc = await db.collection('users').doc(req.params.userId).get();
        if (!doc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ progress: doc.data().progress || {} });
    } catch (err) {
        console.error('Progress load error:', err);
        res.status(500).json({ error: 'Error al cargar progreso' });
    }
});

/* ══════════════════════════════════════════════════
   10) LISTA DE USUARIOS (AdminPanel)
   GET /api/users
══════════════════════════════════════════════════ */
app.get('/api/users', async (req, res) => {
    try {
        const snap = await db.collection('users').get();
        const users = snap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                name: d.name,
                email: d.email,
                method: d.google_id ? 'google' : d.password ? 'email' : 'face',
                role: d.role || 'student',
                progress: d.progress || {},
                loginCount: d.loginCount || 0,
                lastLogin: d.lastLogin?.toDate?.()?.toISOString() || null,
                registeredAt: d.createdAt?.toDate?.()?.toISOString() || null,
            };
        });
        res.json({ success: true, users });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

/* ══════════════════════════════════════════════════
   11) LISTA DE ADMINS (AdminPanel)
   GET /api/admins
══════════════════════════════════════════════════ */
app.get('/api/admins', async (req, res) => {
    try {
        const snap = await db.collection('users').where('role', '==', 'admin').get();
        const admins = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, admins });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener admins' });
    }
});

/* ══════════════════════════════════════════════════
   INICIAR SERVIDOR
══════════════════════════════════════════════════ */
app.listen(PORT, () => {
    console.log(`\n🚀 VentoEdu Backend corriendo en http://localhost:${PORT}`);
    console.log(`📦 Listo para produccion en Railway y conexion con Netlify\n`);
});