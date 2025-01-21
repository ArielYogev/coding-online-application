const mongoose = require('mongoose');


const codeBlockSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 255 },  
    template: { type: String, required: true }, 
    solution: { type: String, required: true }, 
  });


module.exports = mongoose.model('CodeBlocks', codeBlockSchema);