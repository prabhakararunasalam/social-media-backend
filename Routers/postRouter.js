import express from "express";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import {
  createPost,
  getAllPosts,
  deletePost,
  likeUnlikePost,
  commentPost,
  editComment,
  deleteComment,
} from "../Controllers/postController.js";
import upload from "../Config/multer.js";

const router = express.Router();

router.post("/create", authMiddleware,upload.single("media"), createPost);
router.get("/all", authMiddleware, getAllPosts);
router.delete("/delete/:id", authMiddleware, deletePost);
router.post("/like/:id", authMiddleware, likeUnlikePost);
router.post("/comment/:id", authMiddleware, commentPost);
router.put("/comment/:postId/:commentId", authMiddleware, editComment);
router.delete("/comment/:postId/:commentId", authMiddleware, deleteComment);

export default router;
