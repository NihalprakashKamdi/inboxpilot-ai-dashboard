import mongoose from 'mongoose';
const EmailSchema = new mongoose.Schema({
  sender:String, company:String, email:String, subject:String, snippet:String, body:String,
  time:String, dateLabel:String, status:{type:String,enum:['assistant','client','none'],default:'assistant'},
  priority:{type:String,enum:['high','normal'],default:'normal'}, unread:{type:Boolean,default:true},
  initials:String, color:String, clientId:String, summary:String, draft:String,
  labels:[String], category:String, sentReplies:[{text:String,createdAt:{type:Date,default:Date.now}}]
},{timestamps:true});
export const Email = mongoose.models.Email || mongoose.model('Email',EmailSchema);
const ClientSchema = new mongoose.Schema({id:String,name:String,company:String,email:String,role:String,initials:String,color:String,emails:Number,lastActivity:String,notes:String},{timestamps:true});
export const Client = mongoose.models.Client || mongoose.model('Client',ClientSchema);
