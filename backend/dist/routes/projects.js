"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const projectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
});
// Create project
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = projectSchema.parse(req.body);
        const userId = req.user.id;
        const project = yield prisma_1.default.project.create({
            data: {
                name: data.name,
                description: data.description,
                ownerId: userId,
                members: {
                    create: {
                        userId: userId,
                        role: 'ADMIN',
                    },
                },
            },
        });
        res.status(201).json(project);
    }
    catch (error) {
        res.status(400).json({ error: 'Bad Request' });
    }
}));
// Get all projects for user
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const projects = yield prisma_1.default.project.findMany({
            where: {
                members: {
                    some: { userId: userId },
                },
            },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Edit project
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const data = projectSchema.parse(req.body);
        const member = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!member || member.role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden: Admin access required' });
            return;
        }
        const project = yield prisma_1.default.project.update({
            where: { id: projectId },
            data: { name: data.name, description: data.description },
        });
        res.json(project);
    }
    catch (error) {
        res.status(400).json({ error: 'Bad Request' });
    }
}));
// Delete project
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const member = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!member || member.role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden: Admin access required' });
            return;
        }
        yield prisma_1.default.project.delete({ where: { id: projectId } });
        res.json({ message: 'Project deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Add Member
router.post('/:id/members', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.id;
        const adminId = req.user.id;
        const { email, role } = req.body;
        const adminMember = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: adminId } },
        });
        if (!adminMember || adminMember.role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden: Admin access required' });
            return;
        }
        const userToAdd = yield prisma_1.default.user.findUnique({ where: { email } });
        if (!userToAdd) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const newMember = yield prisma_1.default.projectMember.create({
            data: {
                projectId,
                userId: userToAdd.id,
                role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        res.status(201).json(newMember);
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'User is already a member' });
            return;
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Remove Member
router.delete('/:id/members/:memberId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.id;
        const adminId = req.user.id;
        const targetUserId = req.params.memberId;
        const adminMember = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: adminId } },
        });
        if (!adminMember || adminMember.role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden: Admin access required' });
            return;
        }
        if (adminId === targetUserId) {
            res.status(400).json({ error: 'Cannot remove yourself' });
            return;
        }
        yield prisma_1.default.projectMember.delete({
            where: { projectId_userId: { projectId, userId: targetUserId } },
        });
        res.json({ message: 'Member removed' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
