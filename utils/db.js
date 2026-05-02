import mongoose from "mongoose";
import {
    userSchema, chatSchema, messageSchema, clusterSchema, clusterMessageSchema, invitationSchema
} from './schemas.js'
import { logStart } from "../startup.js";

await mongoose.connect(process.env.MONGO_URL);
logStart('database')

const User = mongoose.model('User', userSchema);
const Chat = mongoose.model('Chat', chatSchema);
const Message = mongoose.model('Message', messageSchema);
const Cluster = mongoose.model('Cluster', clusterSchema);
const ClusterMessage = mongoose.model('ClusterMessage', clusterSchema);
const Invitation = mongoose.model('Invitation', invitationSchema);

// Create indexes
await Promise.all([
  Message.collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
  Message.collection.createIndex({ chat_id: 1, created_at: -1 }),
  Chat.collection.createIndex({ participants: 1 })
]);

export {
  User,
  Chat,
  Message,
  Cluster,
  ClusterMessage,
  Invitation,
}