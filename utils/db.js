import mongoose from "mongoose";
import {
  userSchema,
  chatSchema,
  messageSchema,
  clusterSchema,
  clusterMessageSchema,
  invitationSchema,
} from "./schemas.js";
import { logStart } from "../startup.js";

const USER_PUBLIC_PROJECTION = "_id username display_name avatar status";
const USER_PRIVATE_PROJECTION =
  "_id username display_name avatar bio status blocked_users";
const VALID_STATUSES = ["online", "away", "dnd", "invisible", "offline"];
const MIN_INVITATION_EXPIRING_HOURS = 1;
const MAX_INVITATION_EXPIRING_HOURS = 2400;
const VALID_EXPIRING_MESSAGE_TIMERS = [1, 5, 30, 60, 1440, 10080];

await mongoose.connect(process.env.MONGO_URL);
logStart("database");

const User = mongoose.model("User", userSchema);
const Chat = mongoose.model("Chat", chatSchema);
const Message = mongoose.model("Message", messageSchema);
const Cluster = mongoose.model("Cluster", clusterSchema);
const ClusterMessage = mongoose.model("ClusterMessage", clusterMessageSchema);
const Invitation = mongoose.model("Invitation", invitationSchema);

// Create indexes
await Promise.all([
  Chat.collection.createIndex({ participants: 1 }),
  Message.collection.createIndex({ chat_id: 1, created_at: -1 }), // findOne last message per chat
  Message.collection.createIndex({ expires_at: 1 }), // TTL
  Cluster.collection.createIndex({ members: 1 }),
  ClusterMessage.collection.createIndex({ cluster_id: 1, created_at: -1 }),
  ClusterMessage.collection.createIndex({ topic_id: 1, created_at: -1 }), // query for topic
  ClusterMessage.collection.createIndex({ expires_at: 1 }), // TTL
  Invitation.collection.createIndex({ cluster_id: 1 }),
  Invitation.collection.createIndex(
    { expires_at: 1 },
    { expireAfterSeconds: MAX_INVITATION_EXPIRING_HOURS * 60 * 60 },
  ),
]);

export {
  User,
  Chat,
  Message,
  Cluster,
  ClusterMessage,
  Invitation,
  USER_PUBLIC_PROJECTION,
  USER_PRIVATE_PROJECTION,
  VALID_STATUSES,
  MIN_INVITATION_EXPIRING_HOURS,
  MAX_INVITATION_EXPIRING_HOURS,
  VALID_EXPIRING_MESSAGE_TIMERS,
};
