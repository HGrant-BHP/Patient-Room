const express = require('express');
const { engine } = require('express-handlebars');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Set up Handlebars with explicit layout configuration
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts/'
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

// Serve static files
app.use(express.static('public'));

// Store connected users and valid IDs
const users = new Map();
const validIds = new Set(['123', '456', '789']); // Example valid IDs - replace with your actual IDs
const adminSockets = new Set(); // Track admin connections

// Routes
app.get('/', (req, res) => {
    res.redirect('/user/invalid'); // Redirect to invalid if no ID provided
});

app.get('/user/:id', (req, res) => {
    const userId = req.params.id;
    if (validIds.has(userId)) {
        res.render('user', { 
            userId,
            layout: 'main'
        });
    } else {
        res.status(403).send('Invalid ID. Access denied.');
    }
});

app.get('/admin', (req, res) => {
    res.render('admin', { 
        validIds: Array.from(validIds),
        layout: 'main'
    });
});

// Socket.IO connection handling
io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (userId === undefined || validIds.has(userId)) {
        socket.userId = userId;
        next();
    } else {
        next(new Error('Invalid ID'));
    }
});

io.on('connection', (socket) => {
    // Check if this is an admin connection
    if (!socket.userId) {
        console.log('Admin connected');
        adminSockets.add(socket.id);
        
        // Send current users list to new admin
        const usersList = Array.from(users.entries()).map(([id, data]) => ({
            id,
            userId: data.userId,
            name: data.name
        }));
        socket.emit('users_list', usersList);
        
        socket.on('disconnect', () => {
            console.log('Admin disconnected');
            adminSockets.delete(socket.id);
        });
        
        // Handle admin setting username
        socket.on('set_username', ({ socketId, username }) => {
            if (users.has(socketId)) {
                users.get(socketId).name = username;
                io.to(socketId).emit('username_updated', { username });
                
                // Broadcast updated users list to all admins
                const updatedUsersList = Array.from(users.entries()).map(([id, data]) => ({
                    id,
                    userId: data.userId,
                    name: data.name
                }));
                broadcastToAdmins('users_list', updatedUsersList);
            }
        });
        
        return;
    }
    
    // Handle regular user connection
    console.log('A user connected with ID:', socket.userId);
    
    // Add user to connected users
    users.set(socket.id, { 
        name: 'Guest',
        userId: socket.userId
    });

    // Broadcast updated users list to all admins
    const usersList = Array.from(users.entries()).map(([id, data]) => ({
        id,
        userId: data.userId,
        name: data.name
    }));
    broadcastToAdmins('users_list', usersList);

    // Handle restore_username event
    socket.on('restore_username', ({ username }) => {
        if (users.has(socket.id)) {
            users.get(socket.id).name = username;
            
            // Broadcast updated users list to all admins
            const updatedUsersList = Array.from(users.entries()).map(([id, data]) => ({
                id,
                userId: data.userId,
                name: data.name
            }));
            broadcastToAdmins('users_list', updatedUsersList);
        }
    });

    // Handle alert button click
    socket.on('alert_clicked', () => {
        const user = users.get(socket.id);
        broadcastToAdmins('user_alert', {
            socketId: socket.id,
            userId: socket.userId,
            username: user.name
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        users.delete(socket.id);
        broadcastToAdmins('user_disconnected', socket.id);
        
        // Send updated users list to all admins
        const updatedUsersList = Array.from(users.entries()).map(([id, data]) => ({
            id,
            userId: data.userId,
            name: data.name
        }));
        broadcastToAdmins('users_list', updatedUsersList);
        
        console.log('User disconnected');
    });
});

// Helper function to broadcast to all admin sockets
function broadcastToAdmins(event, data) {
    adminSockets.forEach(adminId => {
        io.to(adminId).emit(event, data);
    });
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Valid IDs:', Array.from(validIds));
}); 