// Auth controller for unified login
const supabase = require('../config/supabase');

// Unified login function for patients, doctors, and staff
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log(`Unified login attempt for email: ${email}`);
    
    // Try to find user in patients table
    let { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('email', email)
      .single();
      
    if (!patientError && patientData) {
      console.log('Found user in patients table');
      
      // Check password
      if (patientData.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate token for patient
      const token = 'patient_' + Math.random().toString(36).substring(2, 15);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = patientData;
      
      return res.status(200).json({
        user: userWithoutPassword,
        token,
        userType: 'patient'
      });
    }
    
    // Try to find user in doctors table
    let { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('email', email)
      .single();
      
    if (!doctorError && doctorData) {
      console.log('Found user in doctors table');
      
      // Check password
      if (doctorData.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate token for doctor
      const token = 'doctor_' + Math.random().toString(36).substring(2, 15);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = doctorData;
      
      return res.status(200).json({
        user: userWithoutPassword,
        token,
        userType: 'doctor'
      });
    }
    
    // Try to find user in staff table
    let { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();
      
    if (!staffError && staffData) {
      console.log('Found user in staff table');
      
      // Check password
      if (staffData.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate token for staff
      const token = 'staff_' + Math.random().toString(36).substring(2, 15);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = staffData;
      
      return res.status(200).json({
        user: userWithoutPassword,
        token,
        userType: 'staff'
      });
    }
    
    // If we reach here, no user was found
    console.log('No user found with provided email');
    return res.status(404).json({ message: 'User not found. Please check your email or register if you\'re new.' });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unified reset password function for all user types
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Basic validation
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    console.log(`Unified password reset attempt for email: ${email}`);
    
    // Try to find user in patients table
    let { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('id, email')
      .eq('email', email)
      .single();
      
    if (!patientError && patientData) {
      console.log('Found user in patients table, resetting password');
      
      // Update password for patient
      const { error: updateError } = await supabase
        .from('patients')
        .update({ password: newPassword })
        .eq('id', patientData.id);
        
      if (updateError) throw updateError;
      
      return res.status(200).json({
        message: 'Password has been reset successfully',
        userType: 'patient'
      });
    }
    
    // Try to find user in doctors table
    let { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('id, email')
      .eq('email', email)
      .single();
      
    if (!doctorError && doctorData) {
      console.log('Found user in doctors table, resetting password');
      
      // Update password for doctor
      const { error: updateError } = await supabase
        .from('doctors')
        .update({ password: newPassword })
        .eq('id', doctorData.id);
        
      if (updateError) throw updateError;
      
      return res.status(200).json({
        message: 'Password has been reset successfully',
        userType: 'doctor'
      });
    }
    
    // Try to find user in staff table
    let { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, email')
      .eq('email', email)
      .single();
        if (!staffError && staffData) {
      console.log('Found user in staff table, resetting password');
      
      // Update password for staff (plain text for consistency)
      const { error: updateError } = await supabase
        .from('staff')
        .update({ password: newPassword })
        .eq('id', staffData.id);
        
      if (updateError) throw updateError;
      
      return res.status(200).json({
        message: 'Password has been reset successfully',
        userType: 'staff'
      });
    }
    
    // If we reach here, no user was found
    console.log('No user found with provided email for password reset');
    return res.status(404).json({ message: 'Account not found. Please check your email or register if you\'re a new patient.' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  login,
  resetPassword
};
