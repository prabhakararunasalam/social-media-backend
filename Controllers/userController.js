import User from "../Models/authModel.js";
import cloudinary from "../Config/cloudinary.js";
import Notification from "../Models/notificationModel.js";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import path from "path";
import fs from 'fs';

export const getUserProfile = async (req, res) => {
  const {id } = req.params;
  try {
    const user = await User.findById({ _id: id }).select("-password -token");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message:"profile found" , user });
    console.log(user);
    
  } catch (error) {
    console.log("error in getUserProfile", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const Follow = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const userToFollowId = req.params.id;

    const userToFollow = await User.findById(userToFollowId);
    const currentUser = await User.findById(loggedInUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    //check the current user is already following the user
    if (!userToFollow.followers.includes(loggedInUserId)) {
      //user is not following the user, so follow the user
      await userToFollow.updateOne({ $push: { followers: loggedInUserId } });
      await currentUser.updateOne({ $push: { following: userToFollowId } });

      //notification
      const notification = new Notification({
        from: loggedInUserId,
        to: userToFollowId,
        type: "follow",
      });
      await notification.save();

      //send response
      res.status(200).json({ message: "User followed successfully" });
    } else {
      //user is already following the user, return an simple message
      res.status(400).json({
        message: `You are already following ${userToFollow.username}`,
      });
    }
  } catch (error) {
    console.log("error in Follow", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

//unfollow

export const unfollow = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const userToUnfollowId = req.params.id;

    const userToUnfollow = await User.findById(userToUnfollowId);
    const currentUser = await User.findById(loggedInUserId);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    //check the current user is already following the user
    if (userToUnfollow.followers.includes(loggedInUserId)) {
      //user is following the user, so unfollow the user
      await userToUnfollow.updateOne({ $pull: { followers: loggedInUserId } });
      await currentUser.updateOne({ $pull: { following: userToUnfollowId } });

      //send response
      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      //user is not following the user, return an simple message
      res.status(400).json({
        message: `You are not following ${userToUnfollow.username}`,
      });
    }
  } catch (error) {
    console.log("error in unfollow", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

//suggestions

export const getSuggestedUsers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "User id is required" });
    }

    const otherUsers = await User.find({ _id: { $ne: id } }).select(
      "-password -token"
    );

    //check if no other users are found
    if (otherUsers.length === 0) {
      return res
        .status(404)
        .json({ message: "currently, No Users are available To Follow" });
    }

    return res.status(200).json(otherUsers);
  } catch (error) {
    console.log("error in getSuggestedUsers", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

//update profile



// Update profile function
export const updateProfile = async (req, res) => {
  const { fullName, bio, username, currentpassword, newPassword, link, email } = req.body;

  // Handle uploaded files (profile and cover images)
  const profileImgFile = req.files.profileImg ? req.files.profileImg[0] : null;
  const coverImgFile = req.files.coverImg ? req.files.coverImg[0] : null;

  const _fileName = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(_fileName);

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      (!newPassword && currentpassword) ||
      (newPassword && !currentpassword)
    ) {
      return res
        .status(400)
        .json({ message: "Current Password and New Password are required" });
    }

    if (newPassword && currentpassword) {
      const isMatch = await bcrypt.compare(currentpassword, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current Password is incorrect" });
      }
      if (newPassword.length < 5) {
        return res
          .status(400)
          .json({ message: "Password must be at least 5 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Delete old profile image from the server if a new one is uploaded
    let profileImgUrl = user.profileImg;
    if (profileImgFile) {
      if (user.profileImg) {
        // Delete old profile image from server
        const oldProfileImgPath = path.join(__dirname, `../uploads/${user.profileImg.split('/').pop()}`);
        if (fs.existsSync(oldProfileImgPath)) {
          fs.unlinkSync(oldProfileImgPath);
        }
      }

      // Upload new profile image to Cloudinary
      const profileImgPath = path.join(__dirname, `../uploads/${profileImgFile.filename}`);
      const result = await cloudinary.uploader.upload(profileImgPath);
      profileImgUrl = result.secure_url; // New profile image URL
    }

    // Delete old cover image from the server if a new one is uploaded
    let coverImgUrl = user.coverImg;
    if (coverImgFile) {
      if (user.coverImg) {
        // Delete old cover image from server
        const oldCoverImgPath = path.join(__dirname, `../uploads/${user.coverImg.split('/').pop()}`);
        if (fs.existsSync(oldCoverImgPath)) {
          fs.unlinkSync(oldCoverImgPath);
        }
      }

      // Upload new cover image to Cloudinary
      const coverImgPath = path.join(__dirname, `../uploads/${coverImgFile.filename}`);
      const result = await cloudinary.uploader.upload(coverImgPath);
      coverImgUrl = result.secure_url; // New cover image URL
    }

    // Update user fields
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.profileImg = profileImgUrl || user.profileImg;
    user.coverImg = coverImgUrl || user.coverImg;

    // Save the updated user profile
    user = await user.save();

    // Password should be null in the response
    user.password = null;

    // Send response with updated user data
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.log("error in updateProfile", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

//search user

export const searchUser = async (req, res) => {
  try {
    const { query } = req.query; //get theserch terms in query parameters

    //search for users by username or fullname
    const users = await User
      .find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullName: { $regex: query, $options: "i" } },
        ],
      })
      .select("-password -token");

    // Return matching users
    if (users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Error in searchUsers: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

//get notification

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification
      .find({ to: userId })
      .populate("from", "username profileImg")
      .sort({ createdAt: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    console.log("Error fetching notifications: ", error.message);
    res.status(500).json({ error: error.message });
  }
};
