import User from "../models/User.js";

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const getUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    // Find all users except the currently authenticated user
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsers: ", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};