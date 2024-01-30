const User = require('../models/userModel');

class UserController {
  static async registerUser(req, res) {
    const { firstName, lastName } = req.body;

    try {
      const newUser = await User.createUser(firstName, lastName);
      res.json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UserController;
