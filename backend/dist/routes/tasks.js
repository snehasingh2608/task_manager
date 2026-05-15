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
const taskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    projectId: zod_1.z.string(),
    assigneeId: zod_1.z.string().optional().nullable(),
});
const updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    assigneeId: zod_1.z.string().optional().nullable(),
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = taskSchema.parse(req.body);
        const userId = req.user.id;
        // Check if user is member of project
        const member = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId: data.projectId, userId } },
        });
        if (!member) {
            res.status(403).json({ error: 'Forbidden: Not a member of this project' });
            return;
        }
        const task = yield prisma_1.default.task.create({
            data: Object.assign({}, data),
            include: { assignee: { select: { id: true, name: true } } },
        });
        res.status(201).json(task);
    }
    catch (error) {
        res.status(400).json({ error: 'Bad Request' });
    }
}));
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { projectId } = req.query;
        if (!projectId || typeof projectId !== 'string') {
            res.status(400).json({ error: 'projectId query param is required' });
            return;
        }
        // Check membership
        const member = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!member) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const tasks = yield prisma_1.default.task.findMany({
            where: { projectId },
            include: {
                assignee: { select: { id: true, name: true, email: true } },
                comments: { include: { author: { select: { id: true, name: true } } } },
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const data = updateTaskSchema.parse(req.body);
        const task = yield prisma_1.default.task.findUnique({ where: { id: taskId } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        const member = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId: task.projectId, userId } },
        });
        if (!member) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const updatedTask = yield prisma_1.default.task.update({
            where: { id: taskId },
            data,
            include: { assignee: { select: { id: true, name: true } } },
        });
        res.json(updatedTask);
    }
    catch (error) {
        res.status(400).json({ error: 'Bad Request' });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const task = yield prisma_1.default.task.findUnique({ where: { id: taskId } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        const member = yield prisma_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId: task.projectId, userId } },
        });
        if (!member || member.role !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden: Admin access required to delete task' });
            return;
        }
        yield prisma_1.default.task.delete({ where: { id: taskId } });
        res.json({ message: 'Task deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
