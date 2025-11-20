// app.js
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;


// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Home route
app.get("/", (req, res) => {
  res.render("index");
});

/* ================= USERS ================= */

// List users
app.get("/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users ORDER BY id DESC");
    res.render("users", { users: rows });
  } catch (err) {
    console.error(err);
    res.send("Error fetching users");
  }
});

// Show add user form
app.get("/users/new", (req, res) => {
  res.render("addUser");
});

// Handle add user
app.post("/users", async (req, res) => {
  const { name, email } = req.body;
  try {
    await db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    res.redirect("/users");
  } catch (err) {
    console.error(err);
    res.send("Error adding user");
  }
});

/* ================= BOOKS ================= */
/* ================= BOOKS ================= */

// List books
app.get("/books", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM books ORDER BY id DESC");
    res.render("books", { books: rows });
  } catch (err) {
    console.error(err);
    res.send("Error fetching books");
  }
});

// Show add book form
app.get("/books/new", (req, res) => {
  res.render("addBook");
});

// Handle add book form submit
app.post("/books", async (req, res) => {
  const { title, author, isbn, total_copies } = req.body;
  const total = parseInt(total_copies || "1", 10);

  try {
    await db.query(
      "INSERT INTO books (title, author, isbn, total_copies, available_copies) VALUES (?, ?, ?, ?, ?)",
      [title, author, isbn, total, total]
    );
    res.redirect("/books");
  } catch (err) {
    console.error(err);
    res.send("Error adding book");
  }
});

// Show edit book form
app.get("/books/:id/edit", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await db.query("SELECT * FROM books WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.send("Book not found");
    }

    res.render("editBook", { book: rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Error loading edit form");
  }
});

// Handle edit book submit
app.post("/books/:id/edit", async (req, res) => {
  const id = req.params.id;
  const { title, author, isbn, total_copies } = req.body;
  const newTotal = parseInt(total_copies || "1", 10);

  try {
    // Get existing book to adjust available_copies safely
    const [rows] = await db.query("SELECT * FROM books WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.send("Book not found");
    }

    const book = rows[0];
    const oldTotal = book.total_copies;
    const oldAvailable = book.available_copies;

    const diff = newTotal - oldTotal;
    let newAvailable = oldAvailable + diff;
    if (newAvailable < 0) newAvailable = 0;

    await db.query(
      "UPDATE books SET title = ?, author = ?, isbn = ?, total_copies = ?, available_copies = ? WHERE id = ?",
      [title, author, isbn, newTotal, newAvailable, id]
    );

    res.redirect("/books");
  } catch (err) {
    console.error(err);
    res.send("Error updating book");
  }
});

// Delete book
app.post("/books/:id/delete", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM books WHERE id = ?", [id]);
    res.redirect("/books");
  } catch (err) {
    console.error(err);
    res.send("Error deleting book");
  }
});


/* ================= ISSUES ================= */

// List issued books
app.get("/issues", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.id, u.name AS user_name, b.title AS book_title,
             i.issue_date, i.due_date, i.return_date
      FROM issues i
      JOIN users u ON i.user_id = u.id
      JOIN books b ON i.book_id = b.id
      ORDER BY i.id DESC
    `);
    res.render("issues", { issues: rows });
  } catch (err) {
    console.error(err);
    res.send("Error fetching issues");
  }
});

// Show issue form
app.get("/issues/new", async (req, res) => {
  try {
    const [users] = await db.query("SELECT * FROM users ORDER BY name ASC");
    const [books] = await db.query(
      "SELECT * FROM books WHERE available_copies > 0 ORDER BY title ASC"
    );
    res.render("issueBook", { users, books });
  } catch (err) {
    console.error(err);
    res.send("Error loading issue form");
  }
});

// Handle issue book
app.post("/issues", async (req, res) => {
  const { user_id, book_id, issue_date, due_date } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Insert issue
    await conn.query(
      "INSERT INTO issues (user_id, book_id, issue_date, due_date) VALUES (?, ?, ?, ?)",
      [user_id, book_id, issue_date, due_date || null]
    );

    // Decrease available copies
    await conn.query(
      "UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0",
      [book_id]
    );

    await conn.commit();
    res.redirect("/issues");
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.send("Error issuing book");
  } finally {
    conn.release();
  }
});

// Mark book as returned
app.post("/issues/:id/return", async (req, res) => {
  const issueId = req.params.id;
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Get issue to know which book
    const [issueRows] = await conn.query("SELECT book_id FROM issues WHERE id = ?", [issueId]);
    if (issueRows.length === 0) {
      await conn.rollback();
      return res.send("Issue not found");
    }
    const bookId = issueRows[0].book_id;

    // Set return_date
    await conn.query("UPDATE issues SET return_date = ? WHERE id = ?", [today, issueId]);

    // Increase available copies
    await conn.query(
      "UPDATE books SET available_copies = available_copies + 1 WHERE id = ?",
      [bookId]
    );

    await conn.commit();
    res.redirect("/issues");
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.send("Error returning book");
  } finally {
    conn.release();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
