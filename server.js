const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');

const notesFolder = path.join(__dirname, 'notes');
if (!fs.existsSync(notesFolder)) {
  fs.mkdirSync(notesFolder);
}

let users = loadUsers(); // Load user data from a file

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/login', (req, res) => {
  res.render('login', { message: req.query.message });
});

app.get('/signup', (req, res) => {
  res.render('signup', { message: req.query.message });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;
    res.redirect('/dashboard');
  } else {
		res.render('login', { message: 'Invalid username or password' });
  }
});

app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  const isUsernameTaken = users.some(user => user.username === username);
	
  if (isUsernameTaken) {
		res.render('signup', { message: 'Username already taken' });
    return;
  }

  users.push({ username, password });
  saveUsers(users); // Save the updated user data to a file
  res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.render('dashboard', { username: req.session.user.username });
  } else {
    res.redirect('/login');
  }
});

app.post('/save-notepad', (req, res) => {
  const { content } = req.body;

  if (!req.session.user) {
    res.status(403).send('Unauthorized');
    return;
  }

  const fileName = req.session.user.username + '-notepad.txt';
  const notesFolder = path.join(__dirname, 'notes');
  const filePath = path.join(notesFolder, fileName);

  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Failed to save notepad content');
    } else {
      res.sendStatus(200);
    }
  });
});

app.get('/get-notepad', (req, res) => {
  if (!req.session.user) {
    res.status(403).send('Unauthorized');
    return;
  }

  const fileName = req.session.user.username + '-notepad.txt';
  const notesFolder = path.join(__dirname, 'notes');
  const filePath = path.join(notesFolder, fileName);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.send('');
    } else {
      res.send(data);
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Failed to log out');
    } else {
      res.redirect('/login');
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Load user data from a file
function loadUsers() {
  const usersFilePath = path.join(__dirname, 'users.json');
  if (fs.existsSync(usersFilePath)) {
    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(usersData);
  } else {
    return [];
  }
}

// Save user data to a file
function saveUsers(usersData) {
  const usersFilePath = path.join(__dirname, 'users.json');
  fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));
}
