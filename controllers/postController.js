import Post from '../models/Post.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createPost = async (req, res) => {
  try {
    console.log('Creating post with data:', req.body);
    console.log('Files received:', req.files);
    
    const { title, content, tags, links } = req.body;
    
    const images = req.files?.images || [];
    const documents = req.files?.documents || [];
    
    const post = new Post({
      title,
      content,
      author: req.user._id,
      tags: tags ? JSON.parse(tags) : [],
      links: links ? JSON.parse(links) : [],
      images: images.map(file => {
        // Create relative path from uploads directory
        const relativePath = `uploads/images/${file.filename}`;
        console.log(`Image saved with path: ${relativePath}`);
        return {
          filename: file.filename,
          originalName: file.originalname,
          path: relativePath,
          mimetype: file.mimetype,
          size: file.size
        };
      }),
      documents: documents.map(file => {
        // Create relative path from uploads directory
        const relativePath = `uploads/documents/${file.filename}`;
        console.log(`Document saved with path: ${relativePath}`);
        return {
          filename: file.filename,
          originalName: file.originalname,
          path: relativePath,
          mimetype: file.mimetype,
          size: file.size
        };
      })
    });

    await post.save();
    await post.populate('author', 'username email avatar');
    
    console.log('Post created successfully with images:', post.images);
    
    res.status(201).json({
      message: 'Publicación creada exitosamente',
      post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ published: true })
      .populate('author', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ published: true });

    console.log(`Fetched ${posts.length} posts`);
    posts.forEach(post => {
      console.log(`Post ${post._id} has ${post.images.length} images:`, post.images.map(img => img.path));
    });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username email avatar');

    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { title, content, tags, links } = req.body;
    
    post.title = title || post.title;
    post.content = content || post.content;
    post.tags = tags ? JSON.parse(tags) : post.tags;
    post.links = links ? JSON.parse(links) : post.links;

    await post.save();
    await post.populate('author', 'username email avatar');

    res.json({
      message: 'Publicación actualizada exitosamente',
      post
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Delete associated files
    [...post.images, ...post.documents].forEach(file => {
      const fullPath = path.join(__dirname, '../', file.path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Deleted file: ${fullPath}`);
      }
    });

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Publicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { postId, fileId } = req.params;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    const file = [...post.images, ...post.documents].find(f => f._id.toString() === fileId);
    if (!file) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const fullPath = path.join(__dirname, '../', file.path);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found at: ${fullPath}`);
      return res.status(404).json({ message: 'Archivo no encontrado en el servidor' });
    }

    res.download(fullPath, file.originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};