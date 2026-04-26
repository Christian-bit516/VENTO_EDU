require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const admin    = require('firebase-admin');
const { OAuth2Client } = require('google-auth-library');

const app    = express();
const PORT   = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'ventoedu_dev_secret';

/* ══════════════════════════════════════════════════
   MIDDLEWARE
══════════════════════════════════════════════════ */
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' })); // face descriptors son arrays grandes

/* ══════════════════════════════════════════════════
   FIREBASE ADMIN (base de datos en la nube)
   Todo el acceso a Firestore pasa por aquí (Node.js)
══════════════════════════════════════════════════ */
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ══════════════════════════════════════════════════
   GOOGLE AUTH CLIENT (para verificar tokens de Google)
══════════════════════════════════════════════════ */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ══════════════════════════════════════════════════
   MIDDLEWARE: verificar JWT
   Protege rutas que requieren sesión iniciada
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
// Buscar usuario por email en Firestore
const findUserByEmail = async (email) => {
    const snap = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Generar JWT con datos del usuario
const signToken = (user) => jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '7d' }
);

/* ══════════════════════════════════════════════════
   1) REGISTRO CON CORREO Y CONTRASEÑA
   POST /api/register
   Body: { name, email, password }
══════════════════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    if (password.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    try {
        // Verificar si el correo ya existe
        const existing = await findUserByEmail(email);
        if (existing) return res.status(400).json({ error: 'El correo ya está registrado' });

        // Hashear contraseña con bcrypt (Node.js la procesa aquí)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Guardar en Firestore a través de Node.js
        const ref = await db.collection('users').add({
            name:      name.trim(),
            email:     email.toLowerCase().trim(),
            password:  hashedPassword,
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
   Body: { email, password }
══════════════════════════════════════════════════ */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });

    try {
        const user = await findUserByEmail(email);

        // Usuario no existe
        if (!user) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

        // Usuario de Google (sin contraseña)
        if (!user.password) return res.status(401).json({ error: 'Esta cuenta usa Google. Inicia sesión con Google.' });

        // Verificar contraseña con bcrypt (Node.js la procesa aquí)
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

        const token = signToken(user);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/* ══════════════════════════════════════════════════
   3) LOGIN CON GOOGLE
   POST /api/google-login
   Body: { credential } ← token JWT que da Google
══════════════════════════════════════════════════ */
app.post('/api/google-login', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Credencial de Google requerida' });

    try {
        // Verificar el token con Google (Node.js valida aquí, no el navegador)
        const ticket = await googleClient.verifyIdToken({
            idToken:  credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub: google_id, email, name } = ticket.getPayload();

        // Buscar si ya existe el usuario
        let user = await findUserByEmail(email);

        if (!user) {
            // Crear usuario nuevo (primer login con Google)
            const ref = await db.collection('users').add({
                name, email: email.toLowerCase(),
                password:  null,
                google_id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            user = { id: ref.id, name, email };
        }

        const token = signToken(user);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(401).json({ error: 'Token de Google inválido' });
    }
});

/* ══════════════════════════════════════════════════
   4) GUARDAR PERFIL FACIAL
   POST /api/face-profile
   Body: { name, email, descriptor[] }
   Requiere: Token JWT (sesión iniciada)
══════════════════════════════════════════════════ */
app.post('/api/face-profile', async (req, res) => {
    const { name, email, descriptor } = req.body;
    if (!name || !email || !descriptor || !Array.isArray(descriptor))
        return res.status(400).json({ error: 'Datos incompletos' });

    try {
        // Verificar si ya tiene perfil facial registrado
        const existing = await db.collection('face_profiles')
            .where('email', '==', email.toLowerCase()).get();

        if (!existing.empty) {
            // Actualizar el perfil existente en lugar de crear uno duplicado
            const docId = existing.docs[0].id;
            await db.collection('face_profiles').doc(docId).update({
                name, descriptor,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.json({ message: 'Perfil facial actualizado', id: docId });
        }

        // Guardar nuevo perfil facial en Firestore a través de Node.js
        const ref = await db.collection('face_profiles').add({
            name:      name.trim(),
            email:     email.toLowerCase().trim(),
            descriptor,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({ message: 'Perfil facial guardado', id: ref.id });
    } catch (err) {
        console.error('Face profile error:', err);
        res.status(500).json({ error: 'Error al guardar perfil facial' });
    }
});

/* ══════════════════════════════════════════════════
   5) OBTENER TODOS LOS PERFILES FACIALES
   GET /api/face-profiles
   Usado para comparar al iniciar sesión con Face ID
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
   7) VERIFICAR TOKEN (para proteger rutas en frontend)
   GET /api/verify
══════════════════════════════════════════════════ */
app.get('/api/verify', verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

/* ══════════════════════════════════════════════════
   INICIAR SERVIDOR
══════════════════════════════════════════════════ */
app.listen(PORT, () => {
    console.log(`\n🚀 VentoEdu Backend corriendo en http://localhost:${PORT}`);
    console.log(`📦 Endpoints disponibles:`);
    console.log(`   POST /api/register`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/google-login`);
    console.log(`   POST /api/face-profile`);
    console.log(`   GET  /api/face-profiles`);
    console.log(`   DELETE /api/face-profile/:id`);
    console.log(`   GET  /api/verify\n`);
});