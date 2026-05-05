import express from "express";
import moment from "moment/moment.js";
import { Cluster, Invitation, User } from "../utils/db.js";
import websocketManager from "../websocket.js";
import SocketEvents from "../socketEvents.js";
import { authenticate } from "../utils/auth.js";

const router = express.Router();
const MIN_INVITATION_EXPIRING_HOURS = 1
const MAX_INVITATION_EXPIRING_HOURS = 2400

router.get('/:invitation_id', authenticate, async (req, res) => {
    try {
        const invitation = await Invitation.findOne({
            id: req.params.invitation_id,
        }).lean();
        
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        const cluster = await Cluster.findOne({
            id: invitation.cluster_id,
        }).lean();
        
        if (!cluster) {
            return res.status(404).json({ error: 'Cluster not found' });
        }

        if (cluster.members.includes(req.user.id)) {
            return res.json({ message: 'Already a member' });
        }
        const updateData = {};
        updateData.members = [...cluster.members, req.user.id]
        await Cluster.updateOne({ id: cluster.id }, { $set: updateData });
        
        res.json({ message: `Joined ${cluster.name} successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
})

router.post('/', authenticate, async (req, res) => {
    try {
        let { clusterId, expireHours } = req.body;
        const cluster = await Cluster.findOne({
            id: clusterId,
            owner_id: req.user.id
        }).lean();
        
        if (!cluster) {
            return res.status(403).json({ error: 'Only the owner can create an invitation.' });
        }

        expireHours = expireHours > MAX_INVITATION_EXPIRING_HOURS ?
            Math.min(expireHours, MAX_INVITATION_EXPIRING_HOURS) :
            expireHours <= MIN_INVITATION_EXPIRING_HOURS ?
            Math.max(expireHours, MIN_INVITATION_EXPIRING_HOURS) :
            expireHours

        const invitation = new Invitation({
            cluster_id: clusterId,
            expires_at: moment().add(expireHours, 'hours')
        })
        await invitation.save();
        
        res.json({ invitationId: invitation.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
})

export default router