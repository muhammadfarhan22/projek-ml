const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

// ?!!!!!!!! Register User !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
async function registerUser(req, res) {
	try {
		const { username, email, password } = req.body;

		if (!username || !email || !password) {
			return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
		}

		const userExists = await isEmailExists(email);
		if (userExists) {
			return res.status(400).json({ success: false, message: 'Email already exists' });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const userId = uuidv4();

		await admin.firestore().collection('users').add({
			userId,
			username,
			email,
			password: hashedPassword,
		});

		res.json({ success: true, message: 'User registered successfully', userId });
	} catch (error) {
		console.error('Error registering user', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
}

async function isEmailExists(email) {
	const snapshot = await admin.firestore().collection('users').where('email', '==', email).get();
	return !snapshot.empty;
}

// ?!!!!!!!! Login User !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
async function loginUser(req, res) {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Email and password are required' });
		}

		const userSnapshot = await admin.firestore().collection('users').where('email', '==', email).get();

		if (userSnapshot.empty) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const user = userSnapshot.docs[0].data();
		const passwordMatch = await bcrypt.compare(password, user.password);

		if (!passwordMatch) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		res.json({ success: true, message: 'Login successful', userId: user.userId });
	} catch (error) {
		console.error('Error authenticating user', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
}

module.exports = { registerUser, loginUser, isEmailExists};
