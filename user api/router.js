const { registerUser, loginUser, getUserById, getImageUrlsByCategory } = require('./handler');

function setupRoutes(app) {
	app.get('/', (req, res) => {
		res.send('Welcome to the API');
	});

	app.post('/api/register', registerUser);
	app.post('/api/login', loginUser);
	app.get('/api/user/:id_user', getUserById);
	app.get('/api/get_image_urls', getImageUrlsByCategory);
}

module.exports = { setupRoutes };
