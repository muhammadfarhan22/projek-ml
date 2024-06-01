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

// ?!!!!!!!! get User Id !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
async function getUserById(req, res) {
	try {
		const userId = req.params.id_user;

		const userSnapshot = await admin.firestore().collection('users').where('userId', '==', userId).get();

		if (userSnapshot.empty) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		const user = userSnapshot.docs[0].data();
		res.json({ success: true, user });
	} catch (error) {
		console.error('Error getting user by ID', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
}

// ?!!!!!!!! get Image !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const storage = new Storage({
	keyFilename: './storageServiceAccountKey.json', // Path menuju serviceAccountKey.json Anda
});

async function getCategoryImageUrls(category, maxImages = 3) {
    try {
        const bucketName = 'dataset-capstone-2023';
        // Sesuaikan prefix ini sesuai dengan struktur folder Anda yang sebenarnya.
        const prefix = `${category}\\`;  // Menggunakan backslash

        const [files] = await storage.bucket(bucketName).getFiles({ prefix });

        let imageData = files
            .filter(file => file.name.endsWith('.png') || file.name.endsWith('.jpg'))
            .map(file => {
                // Replace backslashes with URL encoded form (%5C) and construct the full URL
                let correctedPath = file.name.replace(/\\/g, '%5C');
                let imageUrl = `https://storage.googleapis.com/${bucketName}/${correctedPath}`;
                let clothingType = extractClothingType(file.name); 

                return { imageUrl, clothingType };
            });

        // Return a subset of images
        return imageData.sort(() => Math.random() - 0.5).slice(0, maxImages);
    } catch (error) {
        console.error('Error getting image URLs:', error);
        throw error;
    }
}

function extractClothingType(filePath) {
    let parts = filePath.split('\\'); // split based on backslash if that's what you're using
    let filename = parts[parts.length - 1];
    return filename.split('_')[0];  // adjust based on your naming convention
}

// Fungsi untuk ekstrak nama pakaian dari path
function extractClothingType(filePath) {
	let parts = filePath.split('/');
	// Mungkin perlu disesuaikan berdasarkan struktur file Anda
	return parts[parts.length - 1].split('_')[0];
}

async function getImageUrlsByCategory(req, res) {
	try {
		const customOrder = ['upperwear', 'bottomwear', 'footwear'];

		const imageUrlsByCategory = {
			top_row: await getCategoryImageUrls(customOrder[0], 3),
			middle_row: await getCategoryImageUrls(customOrder[1], 3),
			bottom_row: await getCategoryImageUrls(customOrder[2], 3),
		};

		res.json({ image_urls_by_category: imageUrlsByCategory });
	} catch (error) {
		console.error('Error getting image URLs by category', error);
		res.status(500).json({ success: false, message: 'Internal Server Error' });
	}
}

module.exports = { registerUser, loginUser, isEmailExists, getUserById, getCategoryImageUrls, getImageUrlsByCategory };
