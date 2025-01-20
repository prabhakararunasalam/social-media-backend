import Post from "../Models/postModel.js";
import User from "../Models/authModel.js";
import Notification from "../Models/notificationModel.js";
import cloudinary from "../Config/cloudinary.js";
import path from "path";
import { fileURLToPath } from "url";
export const createPost = async (req, res) => {
  try {
    const { text, mediaType} = req.body;
    const mediaFile = req.file;
    const _fileName = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(_fileName);

    console.log("Body:", req.body);
    console.log("File:", req.file);
    if (!text || !mediaType) {
      return res
        .status(400)
        .json({ message: "Text and media type are required" });
    }
    //mediaurl
    let mediaUrl = "";
    if(mediaFile) {
      //if media file is provided, upload it to cloudinary
    const filepath = path.join(__dirname, `../uploads/${mediaFile.filename}`);
    const result = await cloudinary.uploader.upload(filepath);
    mediaUrl = result.secure_url;
    }

    const newPost = new Post({
      user: req.user._id,
      text,
      media: mediaUrl,
      mediaType,
    });
    await newPost.save();

    res.status(201).json({ message: "Post created successfully", newPost });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server error"});
    
    }
  };

   
//get all posts
export const getAllPosts = async (req, res) => {
  try {
    const { userId, filtertype } = req.query; //filtertype is either "following" or "all"

    let posts;

    //fetch post of following users
    if (filtertype === "following") {
      const user = await User.findById(userId);
      const followingUsers = user.following;

      (posts = await Post.find({ user: { $in: followingUsers } })
        .populate({
          path: "user",
          select: "-password -token",
        })
        .sort({ createdAt: -1 })),
        populate({
          path: "comments.user",
          select: "-password -token",
        });
    } else {
      //fetch all posts
      posts = await Post.find({})
        .populate({
          path: "user",
          select: "-password -token",
        })
        .sort({ createdAt: -1 })
        .populate({
          path: "comments.user",
          select: "-password -token",
        });
    }

    if (posts.length === 0) {
      //while fetching posts, if no posts found
      return res.status(404).json({ message: "No posts found" });
    }

    //send response
    res.status(200).json({ message: "Posts fetched successfully", posts });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//delete post

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user.id.toString()) {
      return res
        .status(401)
        .json({ message: "you are unauthorised to delete this post" });
    }
    if (post.media) {
      const mediaId = post.media.split("/")[4].split(".")[0];
      await cloudinary.uploader.destroy(mediaId);
    }
    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "something went wrong" });
  }
};

//like unlike post

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const User_Liked_post = post.likes.includes(userId);

    if (User_Liked_post) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } }); //this is for likes

      const updatedLikes = await User.updateOne(
        { _id: userId },
        { $pull: { likedPosts: postId } }
      );

      res
        .status(200)
        .json({ message: "Post unliked successfully", updatedLikes });
    } else {
      post.likes.push(userId);

      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });

      await post.save();

      res.status(200).json({ message: "Post liked successfully" });

      //notification
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();
    }
  } catch (error) {
    console.log("Error in likeUnlikePost controller", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

//comment post

export const commentPost = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: postId } = req.params;

    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = {
      user: userId,
      text,
      createdAt: new Date(),
    };

    post.comments.push(comment);

    await post.save();

    const populatedPost = await Post.findById(postId).populate(
      "comments.user",
      "username"
    );

    const newComment =
      populatedPost.comments[populatedPost.comments.length - 1];

    res.status(200).json({
      message: "Comment added successfully",
      comment: newComment,
      success: true,
    });

    //notification
    const notification = new Notification({
      from: userId,
      to: post.user,
      type: "comment",
    });
    await notification.save();
  } catch (error) {
    console.log("Error in commentPost controller", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

export const editComment = async (req, res) => {
  const { postId, commentId } = req.params;  // Get the postId and commentId from the URL
  const { text } = req.body;                 // New text for the comment
  const user = req.user;                     // The user who is editing the comment

  // Validate the text input
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  try {
    // Find the post by postId
    const post = await Post.findOne({ _id: postId, "comments._id": commentId });

    if (!post) {
      return res.status(404).json({ error: "Post or comment not found" });
    }

    // Find the comment within the post and update its text
    const comment = post.comments.id(commentId);
    if (comment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "You are not authorized to edit this comment" });
    }

    comment.text = text;  // Update the comment text
    await post.save();    // Save the post with the updated comment

    res.status(200).json({
      message: "Comment updated successfully",
      updatedComment: comment, // Return the updated comment
    });
  } catch (error) {
    console.error("Error editing comment:", error);
    res.status(500).json({ error: "Failed to edit comment" });
  }
};


export const deleteComment = async (req, res) => {
  const { commentId, postId } = req.params;  // Extract postId and commentId from URL params
  const user = req.user;  // The user requesting the delete operation

  try {
    // Find the post by postId and ensure the comment belongs to the user
    const post = await Post.findOneAndUpdate(
      { _id: postId, "comments._id": commentId, "comments.user": user._id },  // Ensure comment belongs to the correct user
      { $pull: { comments: { _id: commentId } } },  // Use $pull to delete the comment by commentId
      { new: true }  // Return the updated post with the comments array modified
    );

    if (!post) {
      return res.status(404).json({ error: "Comment not found or unauthorized" });
    }

    // Return success message after deleting the comment
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
