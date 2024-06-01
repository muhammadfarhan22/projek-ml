const { registerUser, loginUser, getUserById, getImageUrlsByCategory } = require('./handler');

function setupRoutes(app) {
	app.get('/', (req, res) => {
		res.send('Welcome to the API');
	});

	app.post('/api/register', registerUser);
	app.post('/api/login', loginUser);
}

module.exports = { setupRoutes };
