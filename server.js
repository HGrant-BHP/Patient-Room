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
const mealSelections = new Map(); // Track meal selections by userId
const surveyResponses = new Map();
const pendingSurveys = new Map();
const declinedSurveys = new Map(); // Track declined surveys
const pendingActions = new Map(); // Store actions for offline users
const userNames = new Map(); // Persistent storage for user names

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

app.get('/user/:id/meals', (req, res) => {
    const userId = req.params.id;
    if (validIds.has(userId)) {
        // Example meal data - in a real app, this would come from a database
        const meals = {
            breakfast: {
                time: "7:30 AM - 9:00 AM",
                options: [
                    { id: "b1", name: "Continental Breakfast", description: "Fresh pastries, fruits, yogurt" },
                    { id: "b2", name: "American Breakfast", description: "Eggs, bacon, toast, hash browns" },
                    { id: "b3", name: "Healthy Start", description: "Oatmeal, berries, honey" }
                ]
            },
            lunch: {
                time: "12:00 PM - 1:30 PM",
                options: [
                    { id: "l1", name: "Grilled Chicken Salad", description: "Fresh greens, grilled chicken, vinaigrette" },
                    { id: "l2", name: "Pasta Primavera", description: "Fresh vegetables, light cream sauce" },
                    { id: "l3", name: "Fish of the Day", description: "Served with seasonal vegetables" }
                ]
            },
            dinner: {
                time: "6:00 PM - 7:30 PM",
                options: [
                    { id: "d1", name: "Roast Chicken", description: "Herb-roasted with vegetables" },
                    { id: "d2", name: "Grilled Salmon", description: "With quinoa and asparagus" },
                    { id: "d3", name: "Vegetable Stir-Fry", description: "With tofu and brown rice" }
                ]
            }
        };
        
        res.render('meals', { 
            userId,
            meals,
            layout: 'main'
        });
    } else {
        res.status(403).send('Invalid ID. Access denied.');
    }
});

app.get('/user/:id/settings', (req, res) => {
    const userId = req.params.id;
    if (validIds.has(userId)) {
        res.render('settings', { 
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

app.get('/user/:id/survey', (req, res) => {
    const userId = req.params.id;
    if (validIds.has(userId)) {
        res.render('survey', { 
            userId,
            layout: 'main'
        });
    } else {
        res.status(403).send('Invalid ID. Access denied.');
    }
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
        const usersList = Array.from(validIds).map(userId => ({
            id: userId,
            userId: userId,
            name: userNames.get(userId) || 'Guest'
        }));
        socket.emit('users_list', usersList);

        // Send current meal selections to new admin
        const mealsList = Array.from(mealSelections.entries()).map(([userId, selections]) => ({
            userId,
            ...selections
        }));
        socket.emit('meal_selections', mealsList);

        // Send current survey responses to new admin
        const surveyList = Array.from(surveyResponses.entries()).map(([userId, responses]) => ({
            userId,
            responses
        }));
        socket.emit('survey_responses', surveyList);
        
        socket.on('disconnect', () => {
            console.log('Admin disconnected');
            adminSockets.delete(socket.id);
        });
        
        // Handle admin setting username
        socket.on('set_username', ({ socketId, username }) => {
            // Store in persistent userNames map using userId
            userNames.set(socketId, username);
            
            // Find all socket instances of this user and update them
            for (const [id, user] of users.entries()) {
                if (user.userId === socketId) {
                    user.name = username;
                    io.to(id).emit('username_updated', { username });
                }
            }
            
            // Broadcast updated users list to all admins
            const updatedUsersList = Array.from(validIds).map(userId => ({
                id: userId,
                userId: userId,
                name: userNames.get(userId) || 'Guest'
            }));
            broadcastToAdmins('users_list', updatedUsersList);
        });

        // Handle admin requesting survey from user
        socket.on('request_survey', ({ userId }) => {
            const userSocket = Array.from(users.entries())
                .find(([_, data]) => data.userId === userId);

            if (userSocket) {
                // User is online, send immediately
                declinedSurveys.delete(userId);
                pendingSurveys.set(userId, true);
                io.to(userSocket[0]).emit('survey_requested');
            } else {
                // User is offline, queue the action
                const actions = pendingActions.get(userId) || [];
                actions.push({
                    type: 'survey',
                    data: {}
                });
                pendingActions.set(userId, actions);
            }
        });
        
        return;
    }
    
    // Handle regular user connection
    console.log('A user connected with ID:', socket.userId);
    
    // Add user to connected users, using stored name if available
    const storedName = userNames.get(socket.userId);
    users.set(socket.id, { 
        name: storedName || 'Guest',
        userId: socket.userId
    });

    // If there's a stored name, send it to the user
    if (storedName) {
        socket.emit('username_updated', { username: storedName });
    }

    // Broadcast updated users list to all admins
    const updatedUsersList = Array.from(validIds).map(userId => ({
        id: userId,
        userId: userId,
        name: userNames.get(userId) || 'Guest'
    }));
    broadcastToAdmins('users_list', updatedUsersList);

    // Process any pending actions for this user
    if (socket.userId && pendingActions.has(socket.userId)) {
        const actions = pendingActions.get(socket.userId);
        actions.forEach(action => {
            switch (action.type) {
                case 'rename':
                    const username = action.data.username;
                    userNames.set(socket.userId, username); // Store in persistent map
                    users.get(socket.id).name = username;
                    socket.emit('username_updated', { username });
                    break;
                case 'survey':
                    socket.emit('survey_requested');
                    break;
            }
        });
        pendingActions.delete(socket.userId); // Clear processed actions
    }

    // Check if there's a pending survey for this user and they haven't declined it
    if (pendingSurveys.has(socket.userId) && !declinedSurveys.has(socket.userId)) {
        socket.emit('survey_requested');
    }

    // If user has previous meal selections, restore them
    if (mealSelections.has(socket.userId)) {
        socket.emit('restore_meal_selections', mealSelections.get(socket.userId));
    }

    // Handle meal selection
    socket.on('meal_selected', ({ mealType, mealId, mealName }) => {
        const user = users.get(socket.id);
        if (!user) return;

        // Update or create meal selections for this user
        if (!mealSelections.has(user.userId)) {
            mealSelections.set(user.userId, {});
        }
        const userSelections = mealSelections.get(user.userId);
        userSelections[mealType] = { id: mealId, name: mealName };

        // Broadcast updated meal selections to all admins
        const mealsList = Array.from(mealSelections.entries()).map(([userId, selections]) => ({
            userId,
            ...selections
        }));
        broadcastToAdmins('meal_selections', mealsList);
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

    // Handle alert acceptance
    socket.on('alert_accepted', ({ socketId, userId, username }) => {
        // Forward the acceptance to the user
        io.to(socketId).emit('alert_accepted');
    });

    // Handle survey submission
    socket.on('survey_submitted', ({ userId, answers }) => {
        // Store survey responses
        surveyResponses.set(userId, answers);
        
        // Remove from pending surveys
        pendingSurveys.delete(userId);

        // Broadcast to admins
        const surveyList = Array.from(surveyResponses.entries()).map(([userId, responses]) => ({
            userId,
            responses
        }));
        broadcastToAdmins('survey_responses', surveyList);
    });

    // Handle survey declined
    socket.on('survey_declined', () => {
        const userId = socket.userId;
        if (userId) {
            declinedSurveys.set(userId, true);
            pendingSurveys.delete(userId);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        users.delete(socket.id);
        
        // Send updated users list to all admins
        const updatedUsersList = Array.from(validIds).map(userId => ({
            id: userId,
            userId: userId,
            name: userNames.get(userId) || 'Guest'
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