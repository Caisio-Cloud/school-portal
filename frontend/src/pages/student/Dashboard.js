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
  Chip
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';

const tabLabels = ['Quiz', 'Assignments', 'Grades', 'Attendance', 'Learning Materials'];

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/student/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId, submission) => {
    try {
      await axios.post(`/student/assignments/${assignmentId}/submit`, { submission });
      toast.success('Assignment submitted successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error('Submission failed');
    }
  };

  const handleSignAttendance = async () => {
    try {
      await axios.post('/student/attendance/sign', {
        sessionCode: dashboardData.attendanceSession.sessionCode
      });
      toast.success('Attendance signed successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to sign attendance');
    }
  };

  const renderQuizTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Available Quizzes
      </Typography>
      {dashboardData?.quizzes?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>{quiz.title}</TableCell>
                  <TableCell>{quiz.description}</TableCell>
                  <TableCell>
                    <Button variant="contained" color="primary">
                      Take Quiz
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No quizzes available</Typography>
      )}
    </Box>
  );

  const renderAssignmentsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Assignments
      </Typography>
      {dashboardData?.assignments?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.title}</TableCell>
                  <TableCell>{new Date(assignment.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={assignment.submissionStatus || 'Not Submitted'}
                      color={assignment.submissionStatus === 'Submitted' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{assignment.submissionGrade || '-'}</TableCell>
                  <TableCell>
                    {!assignment.submissionStatus && (
                      <Button
                        variant="outlined"
                        onClick={() => {
                          const submission = prompt('Enter your submission:');
                          if (submission) {
                            handleSubmitAssignment(assignment.id, submission);
                          }
                        }}
                      >
                        Submit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No assignments</Typography>
      )}
    </Box>
  );

  const renderGradesTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Grades
      </Typography>
      {dashboardData?.grades?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.grades.map((grade, index) => (
                <TableRow key={index}>
                  <TableCell>{grade.subject}</TableCell>
                  <TableCell>{grade.score}</TableCell>
                  <TableCell>
                    <Chip
                      label={grade.remarks}
                      color={grade.remarks === 'Passed' ? 'success' : 'error'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No grades available</Typography>
      )}
    </Box>
  );

  const renderAttendanceTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Attendance
      </Typography>
      {dashboardData?.attendanceSession ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Attendance Session
            </Typography>
            <Typography>Session Code: {dashboardData.attendanceSession.sessionCode}</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSignAttendance}
              sx={{ mt: 2 }}
            >
              Sign Attendance
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Typography>No active attendance session</Typography>
      )}
    </Box>
  );

  const renderMaterialsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Learning Materials
      </Typography>
      {dashboardData?.materials?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{material.title}</TableCell>
                  <TableCell>{material.description}</TableCell>
                  <TableCell>{new Date(material.uploadDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => window.open(material.filepath, '_blank')}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No learning materials available</Typography>
      )}
    </Box>
  );

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
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
        {activeTab === 0 && renderQuizTab()}
        {activeTab === 1 && renderAssignmentsTab()}
        {activeTab === 2 && renderGradesTab()}
        {activeTab === 3 && renderAttendanceTab()}
        {activeTab === 4 && renderMaterialsTab()}
      </Box>
    </Box>
  );
}
