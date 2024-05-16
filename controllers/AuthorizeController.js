const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

/**
 * AuthController class to handle authentication and authorization.
 */
class AuthController {
  /**
   * loginUser - Authenticates a user and generates a JWT if successful.
   * 
   * @param {Object} req - The request object containing user credentials.
   * @param {Object} res - The response object to send back the JWT and user info.
   */
  static async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      // Authenticate the user with email and password.
      const user = await User.authenticate(email, password);
      if (user) {
        // Get client ID for the authenticated user.
        const clientId = await User.getClientId(user.id);
        
        // Sign a JWT with user details.
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET, 
          { expiresIn: '1h' } // Token expires in 1 hour.
        );

        // Respond with success message, token, user role, and client ID.
        console.log("login OK");
        res.json({ message: "Login successful", token, role: user.role, clientId: clientId });
      } else {
        // Respond with error message if authentication fails.
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error(error);
      // Respond with internal server error message.
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * checkAdmin - Middleware to verify if the authenticated user is an admin.
   * 
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function in the stack.
   */
  static async checkAdmin(req, res, next){
    try {
        // Extract token from the Authorization header.
        const token = req.headers.authorization.split(" ")[1]; 
        // Decode and verify the JWT.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if the decoded role is not admin.
        if (decoded.role !== 'Admin') {
            // Respond with forbidden access error if not admin.
            return res.status(403).json({ message: "Accès refusé" });
        }

        // Attach decoded user to request object.
        req.user = decoded;
        next(); // Call next middleware in the stack.
    } catch (error) {
        // Respond with authentication failed message.
        return res.status(401).json({ message: "Authentification échouée" });
    }
  }


}

module.exports = AuthController;
