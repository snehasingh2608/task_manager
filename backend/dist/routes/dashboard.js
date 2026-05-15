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
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Projects user is part of
        const memberships = yield prisma_1.default.projectMember.findMany({
            where: { userId },
            select: { projectId: true },
        });
        const projectIds = memberships.map((m) => m.projectId);
        // Tasks in these projects
        const tasks = yield prisma_1.default.task.findMany({
            where: { projectId: { in: projectIds } },
        });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
        const assignedToMe = tasks.filter((t) => t.assigneeId === userId);
        const now = new Date();
        const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE').length;
        const tasksDueToday = tasks.filter((t) => {
            if (!t.dueDate)
                return false;
            const due = new Date(t.dueDate);
            return (due.getDate() === now.getDate() &&
                due.getMonth() === now.getMonth() &&
                due.getFullYear() === now.getFullYear() &&
                t.status !== 'DONE');
        }).length;
        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
        res.json({
            totalTasks,
            completedTasks,
            assignedToMeCount: assignedToMe.length,
            overdueTasks,
            tasksDueToday,
            completionRate,
            projectsCount: projectIds.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
