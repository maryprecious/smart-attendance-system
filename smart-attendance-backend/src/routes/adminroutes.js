const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { AttendanceLog, AuditLog } = require('../models/dbassociation');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

const adjustmentSchema = z.object({
  userId: z.number().int().positive(),
  qrSessionId: z.number().int().positive().optional(),
  timestamp: z.string().datetime(),
  status: z.enum(['present', 'late', 'absent']),
  method: z.enum(['qr', 'manual']).default('manual'),
  reason: z.string().min(10, 'Reason must be at least 10 characters long')
});

router.post('/attendance/add', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const data = adjustmentSchema.parse(req.body);

    const attendance = await AttendanceLog.create({
      user_id: data.userId,
      qr_session_id: data.qrSessionId || null,
      timestamp: data.timestamp,
      status: data.status,
      method: data.method,
    });

    await AuditLog.create({
      performed_by: req.user.id,
      action: 'ADD_ATTENDANCE',
      entity_type: 'AttendanceLog',
      entity_id: attendance.id,
      reason: data.reason,
      new_values: attendance.toJSON(),
      changes_description: `Admin manually added attendance: ${data.status} for user ${data.userId} on ${data.timestamp}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      attendance_log_id: attendance.id
    });

    res.status(201).json({
      success: true,
      message: 'Attendance added successfully',
      attendance
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error('Add attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to add attendance' });
  }
});

router.put('/attendance/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = adjustmentSchema.partial().parse(req.body);

    const attendance = await AttendanceLog.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const oldValues = attendance.toJSON();
    await attendance.update(data);

    await AuditLog.create({
      performed_by: req.user.id,
      action: 'EDIT_ATTENDANCE',
      entity_type: 'AttendanceLog',
      entity_id: id,
      reason: data.reason || 'No reason provided',
      old_values: oldValues,
      new_values: attendance.toJSON(),
      changes_description: `Admin edited attendance from ${oldValues.status} to ${attendance.status || 'unchanged'}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      attendance_log_id: id
    });

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      attendance
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error('Edit attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to update attendance' });
  }
});

router.delete('/attendance/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required (minimum 10 characters)'
      });
    }

    const attendance = await AttendanceLog.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const oldValues = attendance.toJSON();
    await attendance.destroy();

    await AuditLog.create({
      performed_by: req.user.id,
      action: 'DELETE_ATTENDANCE',
      entity_type: 'AttendanceLog',
      entity_id: id,
      reason,
      old_values: oldValues,
      new_values: null,
      changes_description: `Admin deleted attendance record`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      attendance_log_id: id
    });

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (err) {
    console.error('Delete attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete attendance' });
  }
});

module.exports = router;