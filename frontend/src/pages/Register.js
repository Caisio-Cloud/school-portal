import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const steps = ['Personal Info', 'Academic Info', 'Account Credentials'];

export default function Register() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    accountType: 'Student',
    grade: '',
    section: '',
    lrn: '',
    username: '',
    password: ''
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    const result = await register(formData);
    if (result.success) {
      navigate('/login');
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              fullWidth
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Account Type</InputLabel>
              <Select
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                label="Account Type"
              >
                <MenuItem value="Student">Student</MenuItem>
                <MenuItem value="Faculty">Faculty</MenuItem>
              </Select>
            </FormControl>
          </>
        );
      case 1:
        if (formData.accountType === 'Student') {
          return (
            <>
              <TextField
                fullWidth
                label="Grade"
                name="grade"
                value={formData.grade}
               
