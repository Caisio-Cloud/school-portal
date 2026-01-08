import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const tabLabels = ['Set Attendance', 'Assignments / Quizzes to Grade', 'Assign Assignment', 'Upload Learning Materials'];

export default function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openAssignmentDialog, setOpenAssignmentDialog] = useState(false);
  const [openMaterialDialog, setOpenMaterialDialog] = useState(false);
  const [formData, setFormData] = useState({
    grade: '',
    section: '',
    title: '',
    description: '',
    dueDate: '',
    filename: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/faculty/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttendance = async () => {
    try {
      await axios.post('/faculty/attendance/start', {
        grade: formData.grade,
        section: formData.section
      });
      toast.success('Attendance session started');
      setOpenAttendanceDialog(false);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start session');
    }
  };

  const handleEndAttendance = async () => {
    try {
      await axios.post('/faculty/attendance/end');
      toast.success('Attendance session ended');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to end session');
    }
  };

  const handleGradeSubmission = async (submissionId) => {
    const grade = prompt('Enter grade (0-100):');
    if (grade && grade >= 0 && grade <= 100) {
      try {
        await axios.post(`/faculty/submissions/${submissionId}/grade`, { grade });
        toast.success('Submission graded successfully');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to grade submission');
      }
    }
  };

  const handleCreateAssignment = async () => {
    try {
      await axios.post('/faculty/assignments', formData);
      toast.success('Assignment created successfully');
      setOpenAssignmentDialog(false);
      setFormData({ grade: '', section: '', title: '', description: '', dueDate: '' });
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };

  const handleUploadMaterial = async () => {
    try {
      await axios.post('/faculty/materials', formData);
      toast.success('Material uploaded successfully');
      setOpenMaterialDialog(false);
      setFormData({ grade: '', section: '', title: '', description: '', filename: '' });
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to upload material');
    }
  };

  const renderAttendanceTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Attendance Management
      </Typography>
      
      {dashboardData?.attendanceSession ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Session
            </Typography>
            <Typography>Session Code: {dashboardData.attendanceSession.sessionCode}</Typography>
            <Typography>Grade: {dashboardData.attendanceSession.grade}</Typography>
            <Typography>Section: {dashboardData.attendanceSession.section}</Typography>
            <Typography>
              Expires: {new Date(dashboardData.attendanceSession.expiresAt).toLocaleString()}
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={handleEndAttendance}
              sx={{ mt: 2 }}
            >
              End Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="contained"
          onClick={() => setOpenAttendanceDialog(true)}
        >
          Start Attendance Session
        </Button>
      )}
    </Box>
  );

  const renderGradingTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Submissions to Grade
      </Typography>
      {dashboardData?.submissions?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Assignment</TableCell>
                <TableCell>Submission</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.studentName}</TableCell>
                  <TableCell>{submission.assignmentTitle}</TableCell>
                  <TableCell>{submission.submission}</TableCell>
                  <TableCell>{new Date(submission.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => handleGradeSubmission(submission.id)}
                    >
                      Grade
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No submissions to grade</Typography>
      )}
    </Box>
  );

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Faculty Dashboard
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && renderAttendanceTab()}
        {activeTab === 1 && renderGradingTab()}
        {activeTab === 2 && (
          <Box>
            <Button
              variant="contained"
              onClick={() => setOpenAssignmentDialog(true)}
            >
              Create New Assignment
            </Button>
          </Box>
        )}
        {activeTab === 3 && (
          <Box>
            <Button
              variant="contained"
              onClick={() => setOpenMaterialDialog(true)}
            >
              Upload New Material
            </Button>
          </Box>
        )}
      </Box>

      {/* Attendance Dialog */}
      <Dialog open={openAttendanceDialog} onClose={() => setOpenAttendanceDialog(false)}>
        <DialogTitle>Start Attendance Session</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              label="Grade"
            >
              {['7', '8', '9', '10', '11', '12'].map((grade) => (
                <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Section"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAttendanceDialog(false)}>Cancel</Button>
          <Button onClick={handleStartAttendance} variant="contained">Start Session</Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={openAssignmentDialog} onClose={() => setOpenAssignmentDialog(false)}>
        <DialogTitle>Create Assignment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              label="Grade"
            >
              {['7', '8', '9', '10', '11', '12'].map((grade) => (
                <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Section"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Due Date"
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignmentDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateAssignment} variant="contained">Create Assignment</Button>
        </DialogActions>
      </Dialog>

      {/* Material Dialog */}
      <Dialog open={openMaterialDialog} onClose={() => setOpenMaterialDialog(false)}>
        <DialogTitle>Upload Learning Material</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              label="Grade"
            >
              {['7', '8', '9', '10', '11', '12'].map((grade) => (
                <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Section"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Filename"
            value={formData.filename}
            onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMaterialDialog(false)}>Cancel</Button>
          <Button onClick={handleUploadMaterial} variant="contained">Upload Material</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
