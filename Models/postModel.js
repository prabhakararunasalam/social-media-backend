import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    text:{
        type:String
    },
    media: {
        type: String, // URL to the media file (image or video)
    },
    mediaType: {
        type: String, // 'image', 'video', or 'none'
        enum: ["image", "video", "none"],
        default: "none",
    },
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    comments:[
        {
            text:{
                type:String,
                required:true
               },
               user:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User",
                required:true
               },
               createdAt: {
                type: Date,
                default: Date.now // Ensure timestamps for comments
              }
        }
    ],
},{timestamps:true})

const Post = mongoose.model("Post",postSchema);
export default Post;