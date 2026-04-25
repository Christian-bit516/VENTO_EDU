const express = require('express');
const cors    = require('cors');
const admin   = require('firebase-admin');
const app     = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' })); // Necesario para descriptores faciales grandes

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ════════════════════════════════════════════
   AUTH – REGISTRO CON CORREO Y CONTRASEÑA
════════════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    try {
        const user = await admin.auth().createUser({ email, password, displayName: name });
        res.status(201).json({ message: 'Usuario creado', uid: user.uid });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/* ════════════════════════════════════════════
   AUTH – LOGIN (verificar usuario por correo)
════════════════════════════════════════════ */
app.post('/api/login', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await admin.auth().getUserByEmail(email);
        res.status(200).json({ user: { uid: user.uid, name: user.displayName, email: user.email } });
    } catch (err) {
        res.status(401).json({ error: 'Usuario no registrado' });
    }
});

/* ════════════════════════════════════════════
   FACE PROFILES – GUARDAR ROSTRO
   POST /api/face-profile
   Body: { name, email, descriptor: number[] }
════════════════════════════════════════════ */
app.post('/api/face-profile', async (req, res) => {
    const { name, email, descriptor } = req.body;
    if (!name || !email || !descriptor || !Array.isArray(descriptor))
        return res.status(400).json({ error: 'Datos incompletos' });
    try {
        const ref = await db.collection('face_profiles').add({
            name,
            email: email.toLowerCase(),
            descriptor,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ message: 'Perfil facial guardado', id: ref.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ════════════════════════════════════════════
   FACE PROFILES – OBTENER TODOS (para login)
   GET /api/face-profiles
════════════════════════════════════════════ */
app.get('/api/face-profiles', async (req, res) => {
    try {
        const snap = await db.collection('face_profiles').get();
        const profiles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ profiles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ════════════════════════════════════════════
   FACE PROFILES – ELIMINAR PERFIL
   DELETE /api/face-profile/:id
════════════════════════════════════════════ */
app.delete('/api/face-profile/:id', async (req, res) => {
    try {
        await db.collection('face_profiles').doc(req.params.id).delete();
        res.status(200).json({ message: 'Perfil eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor VentoEdu corriendo en puerto ${PORT}`));