import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';

export const register = async(req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if(!username || !email || !password) {
            return res.status(400).json({ message : "Please fill all the fields" });
        }

        const existingUser = await User.findOne({ email });
        if(existingUser) {
            return res.status(400).json({ message : "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ username, email, password : hashedPassword });

        res.status(201).json({
            success : true,
            user : {
                id : user._id,
                username : user.username,
                email : user.email, 
            }
        });
    }
    catch(error){
        console.log(error);
        res.status(500).json({ message : "Server Error" });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required",
        });
        }

        // Find User
        const user = await User.findOne({ email });

        if (!user) {
        return res.status(400).json({
            message: "Invalid credentials",
        });
        }

        // Compare Password
        const isMatch = await bcrypt.compare(
        password,
        user.password
        );

        if (!isMatch) {
        return res.status(400).json({
            message: "Invalid credentials",
        });
        }

        // Generate JWT
        const token = generateToken(user._id);

        // Response
        res.status(200).json({
        success: true,
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
        },
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
        message: "Server Error",
        });
    }
};

