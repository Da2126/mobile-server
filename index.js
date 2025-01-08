const express = require("express");
const mongoose = require("mongoose");
const Employee = require('./employeeModel'); // Ensure you have this model properly set up
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require("http");
const nodemailer = require('nodemailer');
const Task = require('./TaskModel'); // Import the Task model
const Truck = require('./TruckModel'); // Import the Task model
const Attendance = require('./attendanceModel'); // Import the Task model
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));  // Increase the limit for JSON payloads

// Root route for testing
app.get('/', (req, res) => {
  res.send('Hello, World! Your server is running on port 8001.');
});

// Database connection
const mongoUrl = "mongodb+srv://daryl:daryl123@cluster0.cvaruww.mongodb.net/truckdb?appName=Cluster0";

mongoose
  .connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database Connected"))
  .catch((e) => console.error("Database connection error:", e));

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "WhCoKdbM4MRZq0w8ok1vneokkPOdAV67VIfD0iUXDwY9zjBAO1wYzmt7iLXwtloo"; // Use environment variable for security

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    next();
  });
};


// Register route
app.post("/register", async (req, res) => {
    const { first_name, middle_name, last_name, email, contact_no, password } = req.body;

    if (!first_name || !last_name || !email || !contact_no || !password || contact_no.length < 11) {
        return res.status(400).json({ message: "Validation error: All fields are required and contact number should be at least 11 characters." });
    }

    try {
        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee) return res.status(400).json({ message: "Email already exists" });

        // Generate Employee ID
        const prefix = "10-";
        const lastEmployee = await Employee.findOne().sort({ Employee_id: -1 }).exec();
        const lastId = lastEmployee ? lastEmployee.Employee_id : `${prefix}000`;
        const numberPart = lastId.split('-')[1];
        const nextNumber = (parseInt(numberPart, 10) + 1).toString().padStart(3, '0');
        const newEmployeeId = `${prefix}${nextNumber}`;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new employee
        const newEmployee = new Employee({
            Employee_id: newEmployeeId,
            first_name: first_name.trim(),
            middle_name,
            last_name: last_name.trim(),
            email: email.trim(),
            contact_no: contact_no.trim(),
            password: hashedPassword,
            status: 0,
            is_active: 1,
            created_at: new Date(),
        });

        // Save the employee
        await newEmployee.save();
        res.json({ message: "Successfully created account" });
    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Error creating employee", error: error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Please provide both identifier (email) and password" });
  }

  try {
    const user = await Employee.findOne({ email: identifier });
    if (!user) return res.status(401).json({ message: 'Invalid credentials: User not found' });

    // Compare the password with the hashed password stored in MongoDB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials: Password mismatch' });

    // Generate JWT token
    const fullName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim();
    const token = jwt.sign({ email: user.email, id: user.Employee_id }, JWT_SECRET, { expiresIn: '1h' });

    // Send success response with JWT token
    return res.json({ message: 'Login successful!', token, fullName, email: user.email, image: user.image });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Fetch logged-in user data route
app.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await Employee.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password, ...userData } = user.toObject();
    res.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Update logged-in user's profile (authenticated route)
app.put('/update-profile', authenticateToken, async (req, res) => {
  const { first_name, midle_name, last_name, email, contact_no, status, is_active, images, address, role, birthday, gender } = req.body; // Add birthday here
  const userEmail = req.user.email; // The email from the authenticated user

  try {
    // Find the user in the database based on the logged-in user's email
    const employee = await Employee.findOne({ email: userEmail });

    if (!employee) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate required fields (example validation)
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    // Check if email format is valid
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Update employee fields with new values or keep old ones if not provided
    employee.first_name = first_name || employee.first_name;
    employee.midle_name = midle_name || employee.midle_name;
    employee.last_name = last_name || employee.last_name;
    employee.email = email || employee.email;
    employee.contact_no = contact_no || employee.contact_no;
    employee.status = status !== undefined ? status : employee.status;
    employee.is_active = is_active !== undefined ? is_active : employee.is_active;
    employee.images = images || employee.images;
    employee.address = address || employee.address;
    employee.gender = gender || employee.gender;
    employee.role = role || employee.role;
    employee.birthday = birthday ? new Date(birthday) : employee.birthday; // Update birthday field

    // Save the updated employee
    await employee.save();

    // Respond with a success message
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);

    // Send more specific error messages based on the type of error
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', error });
    }

    res.status(500).json({ message: 'Server error', error });
  }
});




app.get('/tasks', authenticateToken, async (req, res) => {
  console.log("Fetching tasks for user ID:", req.user.id); 
  try {
      const tasks = await Task.find({
          $or: [
              { driver_id: req.user.id },
              { assistant_id: req.user.id }
          ],
          status: 2 
      });

     
      res.json(tasks); 
  } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});


app.get('/pending-tasks', authenticateToken, async (req, res) => {
  console.log("Fetching tasks for user ID:", req.user.id);
  try {
      const tasks = await Task.find({
          $or: [
              { driver_id: req.user.id },
              { assistant_id: req.user.id }
          ],
          status: { $in: [0, 1] } // Fetch tasks with status 0 and 1
      });
      res.status(200).json(tasks);
  } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});




// Fetch all employees route
app.get('/employees', authenticateToken, async (req, res) => {
  try {
      const employees = await Employee.find({}, 'Employee_id first_name middle_name last_name email contact_no'); // Adjust fields as necessary
      res.json(employees);
  } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: 'Failed to fetch employees.' });
  }
});


  
// Fetch task details by task number
app.get('/task/:taskNo', authenticateToken, async (req, res) => {
  const { taskNo } = req.params;

  try {
    const task = await Task.findOne({ task_no: taskNo });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Respond with the destination and any other required info
    res.json({
      task_no: task.task_no,
      destination: task.destination,
      company_name: task.company_name,
      estimated_time: task.estimated_time,
      
      // Add any other fields you want to return
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: 'Failed to fetch task.' });
  }
});


app.put('/task/:taskNo/accept', authenticateToken, async (req, res) => {
  const { taskNo } = req.params;
  const { status, ship_time } = req.body;

  try {
      const task = await Task.findOneAndUpdate(
          { task_no: taskNo },
          { status, ship_time },
          { new: true } // Return the updated document
      );

      if (!task) {
          return res.status(404).json({ message: 'Task not found' });
      }

      res.json({ message: 'Task accepted successfully', task });
  } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: 'Failed to update task.' });
  }
});

app.put('/task/:taskNo/complete', authenticateToken, async (req, res) => {
  const { taskNo } = req.params;
  const { proof_image } = req.body;

  try {
      const task = await Task.findOne({ task_no: taskNo });

      if (!task) {
          return res.status(404).json({ message: 'Task not found' });
      }

      task.proof_image = proof_image; // Save the proof image
      task.status = 2; // Set task status to completed
      task.completed_time = new Date(); // Set the completed time
      await task.save();

      await Employee.updateMany(
          { $or: [{ Employee_id: task.driver_id }, { Employee_id: task.assistant_id }] },
          { $set: { status: 0 } }
      );

      await Truck.updateOne(
          { truck_no: task.truck_no },
          { $set: { status: 0 } }
      );

      res.json({ message: 'Task completed successfully', task });
  } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: 'Failed to complete task.', error: error.message });
  }
});


app.get('/attendance', authenticateToken, async (req, res) => {
  const { id } = req.user;

  console.log("Looking for attendance for user:", id);

  try {
    const attendance = await Attendance.findOne({ employee_id: id });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance data not found' });
    }

    // Log the data to check its structure
    console.log("Attendance data:", attendance);
    console.log("Sessions:", attendance.sessions);  // Log session data for inspection

    // Filter the sessions to count `time_out` values that are defined
    const timeOutCount = attendance.sessions.filter(session => session.time_out !== undefined).length;

    console.log("Time Outs:", timeOutCount);

    return res.json({
      timeOutCount, // Send the count of sessions with time_out
      totalDays: attendance.sessions.length  // Total number of sessions
    });
  } catch (error) {
  
    return res.status(500).json({ message: 'Server error' });
  }
});


app.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if the email exists in the Employee collection
    const user = await Employee.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate a reset token (could be a JWT or a random string)
    const resetToken = jwt.sign({ email }, 'WhCoKdbM4MRZq0w8ok1vneokkPOdAV67VIfD0iUXDwY9zjBAO1wYzmt7iLXwtloo', { expiresIn: '1h' }); // Adjust the secret key as needed

    
    user.resetToken = resetToken;  // Assuming you have a resetToken field in your schema
    await user.save();

    // Send the token in the response or email
    res.json({ message: 'Email verified successfully', resetToken });
    

  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/update-password', async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New password and confirm password do not match" });
  }

  // Ensure password is at least 6 characters long
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password should be at least 6 characters long" });
  }

  try {
    // Decode the reset token
    const decoded = jwt.verify(resetToken, JWT_SECRET);  // Use your JWT_SECRET here
    const userEmail = decoded.email;

    // Find the user in the database
    const user = await Employee.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    // Respond with success message
    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server error, please try again later" });
  }
});


const server = http.createServer(app);

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Node.js server started on port ${PORT}`);
});



