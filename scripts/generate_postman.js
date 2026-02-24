import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../smana_backend.postman_collection.json');

// --- Auth Header Templates ---
const bearerAuth = [
    {
        key: "Authorization",
        value: "Bearer {{token}}",
        type: "text"
    },
    {
        key: "Content-Type",
        value: "application/json",
        type: "text"
    }
];

const adminKeyAuth = [
    {
        key: "x-admin-api-key",
        value: "{{admin_api_key}}",
        type: "text"
    },
    {
        key: "Content-Type",
        value: "application/json",
        type: "text"
    }
];

const jsonHeader = [
    {
        key: "Content-Type",
        value: "application/json",
        type: "text"
    }
];

// --- Helper to build URL object ---
function buildUrl(path) {
    return {
        raw: `{{base_url}}${path}`,
        host: ["{{base_url}}"],
        path: path.split('/').filter(x => x)
    };
}

// --- Helper to build request body ---
function bodyRaw(json) {
    return {
        mode: "raw",
        raw: JSON.stringify(json, null, 2),
        options: { raw: { language: "json" } }
    };
}

// --- Collection Definition ---
const collection = {
    info: {
        name: "Smana Backend API",
        description: "Complete API reference for Smana Hotel Management Backend.\n\n**Variables to set:**\n- `base_url`: e.g. `https://api.smanahotels.com` or `http://localhost:5000`\n- `token`: JWT token from Guest Login or Staff Login response\n- `admin_api_key`: Admin API key for admin-only routes",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: [
        { key: "base_url", value: "http://localhost:5000", type: "string" },
        { key: "token", value: "", type: "string" },
        { key: "admin_api_key", value: "", type: "string" }
    ],
    item: [
        // ──────────────────────────────────────────
        // AUTH (Staff)
        // ──────────────────────────────────────────
        {
            name: "🔐 Auth (Staff)",
            description: "Staff/Admin login and logout. Roles: Admin, Manager, Receptionist, Chef, Housekeeping, IT, Front Office, Maintenance",
            item: [
                {
                    name: "POST Staff Login",
                    request: {
                        method: "POST",
                        header: jsonHeader,
                        url: buildUrl("/api/auth/login"),
                        body: bodyRaw({ email: "admin@smana.com", password: "password123" }),
                        description: "Login as a staff member. Returns JWT token in cookie + user info.\n\n**Roles Available:** Admin, Manager, Receptionist, Chef, Housekeeping, IT, Front Office, Maintenance"
                    },
                    response: []
                },
                {
                    name: "POST Staff Logout",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/auth/logout"),
                        description: "Clears JWT cookie and logs out the staff member. Requires authentication."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // GUESTS (Mobile App)
        // ──────────────────────────────────────────
        {
            name: "👤 Guests (Mobile App)",
            description: "Guest registration, login, check-in, setup stay, and checkout for the mobile app.",
            item: [
                {
                    name: "POST Guest Register",
                    request: {
                        method: "POST",
                        header: jsonHeader,
                        url: buildUrl("/api/guests/register"),
                        body: bodyRaw({
                            name: "John Doe",
                            email: "john@example.com",
                            phone: "+911234567890",
                            password: "password123"
                        }),
                        description: "Register a new guest account.\n\n**Note:** Registration does NOT return a token. Guest must login separately after registration."
                    },
                    response: []
                },
                {
                    name: "POST Guest Login",
                    request: {
                        method: "POST",
                        header: jsonHeader,
                        url: buildUrl("/api/guests/login"),
                        body: bodyRaw({ email: "john@example.com", password: "password123" }),
                        description: "Login as a guest. Returns JWT token, check-in status, room details, and stay dates.\n\n**Response includes:** `_id`, `name`, `email`, `roomNumber`, `isCheckedIn`, `checkInDate`, `checkOutDate`, `token`"
                    },
                    response: []
                },
                {
                    name: "POST Guest Setup Stay (Self Check-in)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/guests/setup-stay"),
                        body: bodyRaw({
                            roomNumber: "101",
                            checkInDate: "2026-02-20T10:00:00.000Z",
                            checkOutDate: "2026-02-23T11:00:00.000Z",
                            force: false
                        }),
                        description: "Guest self check-in: set room number and stay dates.\n\n**Fields:**\n- `roomNumber` (required): Room to check into\n- `checkInDate` (required): ISO 8601 date string\n- `checkOutDate` (required): Calculated from check-in + stay duration (in days) entered in the mobile app\n- `force` (optional, default false): If `true`, forces check-in even if room is occupied by another guest (admin override)\n\n**Triggers:** Socket event `guest-checked-in`, notifications to Admin & Receptionist."
                    },
                    response: []
                },
                {
                    name: "GET All Guests (Staff)",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/guests"),
                        description: "Get all registered guests. For staff/admin use. Returns array sorted by last updated."
                    },
                    response: []
                },
                {
                    name: "POST Staff Check-in Guest (Admin/Receptionist)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/guests"),
                        body: bodyRaw({
                            name: "Jane Smith",
                            email: "jane@example.com",
                            phone: "+919876543210",
                            roomNumber: "202",
                            checkOutDate: "2026-02-25T12:00:00.000Z"
                        }),
                        description: "Admin/Staff manually check-in a guest. Creates guest if not found, or updates existing.\n\n**Triggers:** Room status set to `Occupied`, socket events, notifications to Admin & Receptionist."
                    },
                    response: []
                },
                {
                    name: "POST Guest Checkout",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/guests/check-out/:id"),
                        description: "Check out a guest by their ID. Sets `isCheckedIn = false`, clears room number, and sets room status to `Cleaning`.\n\n**URL Param:** `:id` = Guest MongoDB `_id`\n\n**Triggers:** Socket event `guest-checked-out`, room status → `Cleaning`."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // ROOMS
        // ──────────────────────────────────────────
        {
            name: "🏨 Rooms",
            description: "Room management: CRUD and status updates.",
            item: [
                {
                    name: "GET All Rooms",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: {
                            raw: "{{base_url}}/api/rooms?page=1&limit=50",
                            host: ["{{base_url}}"],
                            path: ["api", "rooms"],
                            query: [
                                { key: "page", value: "1" },
                                { key: "limit", value: "50" }
                            ]
                        },
                        description: "Get all rooms with pagination. Sorted by room number.\n\n**Query Params:** `page`, `limit`\n**Access:** All authenticated staff and guests."
                    },
                    response: []
                },
                {
                    name: "POST Create Room (Admin)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/rooms"),
                        body: bodyRaw({
                            roomNumber: "301",
                            type: "Deluxe",
                            floor: 3,
                            status: "Available"
                        }),
                        description: "Create a new room. Admin only.\n\n**Status values:** `Available`, `Occupied`, `Cleaning`, `Maintenance`"
                    },
                    response: []
                },
                {
                    name: "GET Room by ID",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/rooms/:id"),
                        description: "Get a single room by MongoDB `_id`."
                    },
                    response: []
                },
                {
                    name: "PUT Update Room Status",
                    request: {
                        method: "PUT",
                        header: bearerAuth,
                        url: buildUrl("/api/rooms/:id/status"),
                        body: bodyRaw({ status: "Cleaning" }),
                        description: "Update a room's status.\n\n**Status values:** `Available`, `Occupied`, `Cleaning`, `Maintenance`\n\n**Access:** Admin, Receptionist, Housekeeping, Manager, Front Office\n\n**Side effects:**\n- `Cleaning` / `Maintenance` → notifies Housekeeping\n- `Available` → auto-checks out the current guest if any\n\n**Triggers:** Socket event `room-status-changed`."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // MENU
        // ──────────────────────────────────────────
        {
            name: "🍽️ Menu",
            description: "Food menu management. Public read, admin/chef write.",
            item: [
                {
                    name: "GET Menu (Public)",
                    request: {
                        method: "GET",
                        header: [],
                        url: buildUrl("/api/menu"),
                        description: "Get all available menu items. Public route - no authentication required."
                    },
                    response: []
                },
                {
                    name: "GET Menu Admin View",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/menu/admin"),
                        description: "Get all menu items including unavailable ones. For admin/chef views.\n\n**Access:** Admin, Chef, Manager"
                    },
                    response: []
                },
                {
                    name: "POST Create Menu Item",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/menu"),
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "Chicken Biryani", type: "text" },
                                { key: "description", value: "Aromatic basmati rice with spiced chicken", type: "text" },
                                { key: "price", value: "250", type: "text" },
                                { key: "category", value: "Main Course", type: "text" },
                                { key: "isAvailable", value: "true", type: "text" },
                                { key: "image", src: "", type: "file" }
                            ]
                        },
                        description: "Create a new menu item. Supports image upload via Cloudinary (multipart/form-data).\n\n**Access:** Admin, Chef, Manager"
                    },
                    response: []
                },
                {
                    name: "PUT Update Menu Item",
                    request: {
                        method: "PUT",
                        header: bearerAuth,
                        url: buildUrl("/api/menu/:id"),
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "name", value: "Chicken Biryani (Updated)", type: "text" },
                                { key: "price", value: "275", type: "text" },
                                { key: "isAvailable", value: "true", type: "text" },
                                { key: "image", src: "", type: "file" }
                            ]
                        },
                        description: "Update an existing menu item. Supports image upload.\n\n**Access:** Admin, Chef, Manager"
                    },
                    response: []
                },
                {
                    name: "DELETE Delete Menu Item",
                    request: {
                        method: "DELETE",
                        header: bearerAuth,
                        url: buildUrl("/api/menu/:id"),
                        description: "Delete a menu item by ID.\n\n**Access:** Admin, Chef, Manager"
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // ORDERS
        // ──────────────────────────────────────────
        {
            name: "📦 Orders",
            description: "Food order management. Guests place orders, staff manage status.",
            item: [
                {
                    name: "POST Place Order (Guest)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/orders"),
                        body: bodyRaw({
                            items: [
                                { menuItemId: "<menu_item_id>", quantity: 2 }
                            ],
                            roomNumber: "101",
                            specialInstructions: "No spice please"
                        }),
                        description: "Guest places a food order.\n\n**Triggers:** Socket event for new order, notification to Chef & Admin."
                    },
                    response: []
                },
                {
                    name: "GET All Orders (Staff)",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/orders"),
                        description: "Get all food orders. Staff view.\n\n**Access:** Admin, Chef, Receptionist, Manager"
                    },
                    response: []
                },
                {
                    name: "GET My Orders (Guest)",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/orders/my"),
                        description: "Get orders placed by the currently logged-in guest."
                    },
                    response: []
                },
                {
                    name: "PUT Update Order Status (Staff)",
                    request: {
                        method: "PUT",
                        header: bearerAuth,
                        url: buildUrl("/api/orders/:id/status"),
                        body: bodyRaw({ status: "Preparing" }),
                        description: "Update the status of a food order.\n\n**Status values:** `Pending`, `Preparing`, `Ready`, `Delivered`, `Cancelled`\n\n**Access:** Admin, Chef, Receptionist, Manager\n\n**Triggers:** Push notification to guest, socket event."
                    },
                    response: []
                },
                {
                    name: "POST Cleanup Pending Orders (Admin)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/orders/cleanup-pending"),
                        description: "Cancels stale pending orders that were never paid. Admin only."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // SERVICE REQUESTS
        // ──────────────────────────────────────────
        {
            name: "🔧 Service Requests",
            description: "Guest service requests. Role-based filtering applied on GET.",
            item: [
                {
                    name: "POST Create Service Request (Guest)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/service-requests"),
                        body: bodyRaw({
                            roomNumber: "101",
                            type: "House Keeping & Laundry",
                            priority: "Normal",
                            message: "Please clean the room"
                        }),
                        description: "Guest creates a service request.\n\n**Type values:** `House Keeping & Laundry`, `Maintenance`, `IT`, `Front Office`\n**Priority values:** `Normal`, `High`, `Urgent`\n**Status (auto-set):** `Open`\n\n**Triggers:** Notifications to Housekeeping and Admin."
                    },
                    response: []
                },
                {
                    name: "GET Service Requests (Role-filtered)",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/service-requests"),
                        description: "Get service requests. **Role-based filtering:**\n- `IT` → only IT requests\n- `Maintenance` → only Maintenance requests\n- `Housekeeping` → only House Keeping & Laundry requests\n- `Front Office` → IT, Front Office, House Keeping & Laundry, Maintenance\n- `Admin` / `Manager` → all requests\n- `Guest` (no role) → only their own requests"
                    },
                    response: []
                },
                {
                    name: "PUT Update Service Request Status (Staff)",
                    request: {
                        method: "PUT",
                        header: bearerAuth,
                        url: buildUrl("/api/service-requests/:id/status"),
                        body: bodyRaw({ status: "In Progress" }),
                        description: "Update status of a service request.\n\n**Status values:** `Open`, `In Progress`, `Resolved`, `Cancelled`\n\n**Access:** Admin, Receptionist, Housekeeping, Manager, IT, Front Office, Maintenance\n\n**Triggers:** Notification to the guest who made the request, socket event."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // NOTIFICATIONS
        // ──────────────────────────────────────────
        {
            name: "🔔 Notifications",
            description: "Real-time in-app notifications. Delivered via Socket.IO and stored in DB.",
            item: [
                {
                    name: "GET My Notifications",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/notifications"),
                        description: "Get the last 50 notifications for the current user.\n\n**Filtering:** Returns notifications targeted to the user's ID or their role.\n\n**Notification types:** `info`, `warning`, `success`, `error`\n\n**Triggers (when notifications are created):**\n- Guest check-in (self or staff)\n- Force checkout\n- Room status change (Cleaning/Maintenance)\n- New service request\n- Service request status update\n- New food order (chef/admin)\n- Order status update (guest)"
                    },
                    response: []
                },
                {
                    name: "PUT Mark Notification as Read",
                    request: {
                        method: "PUT",
                        header: bearerAuth,
                        url: buildUrl("/api/notifications/:id/read"),
                        description: "Mark a specific notification as read by its ID.\n\n**URL Param:** `:id` = Notification MongoDB `_id`"
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // STAFF
        // ──────────────────────────────────────────
        {
            name: "👥 Staff",
            description: "Staff management. Admin creates, all authenticated users can list.",
            item: [
                {
                    name: "GET All Staff",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/staff"),
                        description: "Get all staff members. Password is excluded from response."
                    },
                    response: []
                },
                {
                    name: "POST Create Staff Member (Admin)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/staff"),
                        body: bodyRaw({
                            name: "Ali Hassan",
                            email: "ali@smana.com",
                            password: "password123",
                            role: "Receptionist"
                        }),
                        description: "Create a new staff member.\n\n**Role values:** `Admin`, `Manager`, `Receptionist`, `Chef`, `Housekeeping`, `IT`, `Front Office`, `Maintenance`"
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // FEEDBACK
        // ──────────────────────────────────────────
        {
            name: "⭐ Feedback",
            description: "Guest feedback submission and admin review.",
            item: [
                {
                    name: "POST Submit Feedback (Guest)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/feedbacks"),
                        body: bodyRaw({
                            rating: 5,
                            description: "Excellent service and clean rooms!",
                            name: "John Doe",
                            email: "john@example.com",
                            phone: "+911234567890"
                        }),
                        description: "Submit feedback. Guest must be checked into a room.\n\n**Note:** `name`, `email`, `phone` auto-filled from profile if not provided. `roomNumber` always taken from the authenticated user's profile."
                    },
                    response: []
                },
                {
                    name: "GET All Feedbacks (Admin/Staff)",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: {
                            raw: "{{base_url}}/api/feedbacks?page=1&limit=20",
                            host: ["{{base_url}}"],
                            path: ["api", "feedbacks"],
                            query: [
                                { key: "page", value: "1" },
                                { key: "limit", value: "20" }
                            ]
                        },
                        description: "Get all guest feedbacks with pagination. Admin only.\n\n**Query Params:** `page`, `limit`"
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // PAYMENTS (HyperPay)
        // ──────────────────────────────────────────
        {
            name: "💳 Payments (HyperPay)",
            description: "Payment processing via HyperPay gateway.",
            item: [
                {
                    name: "POST Create Checkout Session",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/payments/checkout"),
                        body: bodyRaw({ orderId: "<order_id>", amount: 250, currency: "AED" }),
                        description: "Create a HyperPay checkout session for an order."
                    },
                    response: []
                },
                {
                    name: "GET Payment Status",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/payments/status/:checkoutId"),
                        description: "Get the payment status for a HyperPay checkout by `checkoutId`."
                    },
                    response: []
                },
                {
                    name: "POST Payment Callback",
                    request: {
                        method: "POST",
                        header: jsonHeader,
                        url: buildUrl("/api/payments/callback/:orderId"),
                        description: "Webhook callback from HyperPay after payment completes. Updates order payment status."
                    },
                    response: []
                },
                {
                    name: "POST Create Registration (Card Save)",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/payments/registration"),
                        body: bodyRaw({ amount: 250, currency: "AED" }),
                        description: "Create a HyperPay registration for saved card payments."
                    },
                    response: []
                },
                {
                    name: "GET Registration Status",
                    request: {
                        method: "GET",
                        header: bearerAuth,
                        url: buildUrl("/api/payments/registration/:checkoutId"),
                        description: "Get the status of a HyperPay registration."
                    },
                    response: []
                },
                {
                    name: "POST Get Payment Token",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/payments/token"),
                        body: bodyRaw({ registrationId: "<registration_id>", amount: 250 }),
                        description: "Get a payment token for a saved card (recurring/token payment)."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // UPLOAD
        // ──────────────────────────────────────────
        {
            name: "📤 Upload",
            description: "File upload to Cloudinary.",
            item: [
                {
                    name: "POST Upload Image",
                    request: {
                        method: "POST",
                        header: bearerAuth,
                        url: buildUrl("/api/upload"),
                        body: {
                            mode: "formdata",
                            formdata: [
                                { key: "image", src: "", type: "file" }
                            ]
                        },
                        description: "Upload a single image to Cloudinary. Returns the Cloudinary URL."
                    },
                    response: []
                }
            ]
        },
        // ──────────────────────────────────────────
        // ADMIN (HyperPay Admin)
        // ──────────────────────────────────────────
        {
            name: "🛡️ Admin (Payment Admin)",
            description: "Admin-only routes for payment order management. Secured with `x-admin-api-key` header instead of JWT.",
            item: [
                {
                    name: "GET All Orders (Admin)",
                    request: {
                        method: "GET",
                        header: adminKeyAuth,
                        url: {
                            raw: "{{base_url}}/api/admin/orders?status=&paymentStatus=&page=1&limit=20&sortBy=createdAt&sortOrder=desc",
                            host: ["{{base_url}}"],
                            path: ["api", "admin", "orders"],
                            query: [
                                { key: "status", value: "" },
                                { key: "paymentStatus", value: "" },
                                { key: "page", value: "1" },
                                { key: "limit", value: "20" },
                                { key: "sortBy", value: "createdAt" },
                                { key: "sortOrder", value: "desc" }
                            ]
                        },
                        description: "Get all orders with filters and pagination.\n\n**Auth:** `x-admin-api-key` header required\n**Query Params:** `status`, `paymentStatus`, `page`, `limit`, `sortBy`, `sortOrder`"
                    },
                    response: []
                },
                {
                    name: "GET Single Order (Admin)",
                    request: {
                        method: "GET",
                        header: adminKeyAuth,
                        url: buildUrl("/api/admin/orders/:id"),
                        description: "Get full order details including guest info.\n\n**Auth:** `x-admin-api-key` header required"
                    },
                    response: []
                },
                {
                    name: "POST Resync Order with HyperPay",
                    request: {
                        method: "POST",
                        header: adminKeyAuth,
                        url: buildUrl("/api/admin/orders/:id/resync"),
                        description: "Re-query HyperPay for latest payment status and sync the order.\n\n**Auth:** `x-admin-api-key` header required\n**Use case:** Fix orders stuck in `pending` payment status."
                    },
                    response: []
                },
                {
                    name: "GET Payment Statistics",
                    request: {
                        method: "GET",
                        header: adminKeyAuth,
                        url: buildUrl("/api/admin/stats"),
                        description: "Get payment statistics grouped by payment status + 10 most recent orders.\n\n**Auth:** `x-admin-api-key` header required"
                    },
                    response: []
                }
            ]
        }
    ]
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(collection, null, 2));
console.log(`✅ Generated Postman collection at ${OUTPUT_FILE}`);
console.log(`   Total folders: ${collection.item.length}`);
console.log(`   Total endpoints: ${collection.item.reduce((acc, folder) => acc + folder.item.length, 0)}`);
