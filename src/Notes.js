import React, { useState, useEffect } from "react";
import "./notes.css";

import Header from "./Header";

//firebase
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase-config";
import { arrayUnion } from "firebase/firestore";

// using fontawesome free icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlus } from "@fortawesome/free-solid-svg-icons";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { faFolderPlus } from "@fortawesome/free-solid-svg-icons";

// Quill.js
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function NoteApp() {
  const [notes, setNotes] = useState([]); // list of all the notes
  const [newNote, setNewNote] = useState(""); // store the content of the new note being typed by the user in the ReactQuill editor.
  const [editIndex, setEditIndex] = useState(null); // keeps track of the index of the note being edited
  const [isEditing, setIsEditing] = useState(false); // is the current not being edited
  const [editingNote, setEditingNote] = useState(""); // store the content of the note being edited by the user in the ReactQuill editor.
  const [selectedCategory, setSelectedCategory] = useState("All"); // store the selected category
  const [customCategory, setCustomCategory] = useState(""); // stores the custom category entered by the user
  const [searchInput, setSearchInput] = useState(""); // stores the value entered by the user in the search bar.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [noteIds, setNoteIds] = useState();
  const [userUID, setUserUID] = useState();
  // Firebase
  const [categories, setCategories] = useState(["All"]); // This state is an array that stores all the available categories fetched from the Firebase database

  const notesCollectionRef = collection(db, "notes"); // firebase 'notes' collection reference
  const categoriesCollectionRef = collection(db, "categories"); // firebase 'categories' collection reference

  // Optimized useEffect for both 'notes' and 'categories' which results in less numebr of reads
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Create a query to fetch only the notes with IDs present in noteIds array
        const q = query(
          collection(db, "notes"),
          where("__name__", "in", noteIds)
        );

        // Fetch the notes and categories simultaneously using Promise.all
        const [notesSnapshot, categoriesSnapshot] = await Promise.all([
          getDocs(q), // Use the query to fetch the desired notes
          getDocs(collection(db, "categories")),
        ]);

        const notesData = notesSnapshot.docs.map((doc) => ({
          // iterate through all the notes and their generated id
          ...doc.data(),
          id: doc.id,
        }));

        const categoriesData = [
          "All",
          ...categoriesSnapshot.docs.map((doc) => doc.data().name), // could also be blank (custom categories)
        ];

        setNotes(notesData);
        setCategories(categoriesData);
      } catch (error) {
        console.log("Error fetching data: ", error);
      }
    };

    fetchData();
  }, [noteIds]);

  // workaround to calculate length because Quill.js returns an HTML tag
  const tempElement = document.createElement("div");
  tempElement.innerHTML = newNote;
  const textLength = tempElement.textContent.length;

  function handleSearchInputChange(e) {
    // searching for notes
    setSearchInput(e.target.value);
  }

  // filter the notes
  const filteredNotes =
    selectedCategory === "All"
      ? notes.filter((note) =>
          note.note.toLowerCase().includes(searchInput.toLowerCase())
        )
      : notes.filter(
          (note) =>
            note.category === selectedCategory &&
            note.note.toLowerCase().includes(searchInput.toLowerCase())
        );

  // for setting date and time when the note is posted
  function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString(); // human readable form
  }

  async function handleAddNote() {
    const quillEditorAdd = document.querySelector(".text-input .ql-editor");
    const editorContentAdd = quillEditorAdd.textContent.trim();
    if (!editorContentAdd) {
      return;
    }

    // rate limit
    if (editorContentAdd.length > 2000) {
      alert("Max Character Limit of 2000 Crossed !");
      return;
    }

    // select the category
    const selectedCat =
      customCategory.trim() !== "" ? customCategory : selectedCategory;

    // user is editing an existing note
    if (editIndex !== null) {
      const noteId = notes[editIndex].id;
      const updatedNote = {
        note: newNote,
        category: selectedCat,
      };
      await updateDoc(doc(notesCollectionRef, noteId), updatedNote); // send the note to firestore

      // updating local state
      const updatedNotes = [...notes];
      updatedNotes[editIndex].note = newNote;
      updatedNotes[editIndex].category = selectedCat;
      setNotes(updatedNotes);
      setEditIndex(null);
      setNewNote("");
    }
    // user is editing a new note
    else {
      const docRef = await addDoc(notesCollectionRef, {
        note: newNote,
        category: selectedCat,
        time: getCurrentDateTime(),
      });

      const userDocRef = doc(db, "users", userUID);
      await updateDoc(userDocRef, {
        noteIds: arrayUnion(docRef.id),
      });

      // updating local state with the new note
      setNotes((prevNotes) => [
        ...prevNotes,
        {
          note: newNote,
          category: selectedCat,
          id: docRef.id,
          time: getCurrentDateTime(),
        },
      ]);
      setNewNote("");
    }
    setCustomCategory("");
  }

  // handles note deletion
  async function handleDeleteNote(id) {
    const deletedNotes = doc(notesCollectionRef, id);
    await deleteDoc(deletedNotes);
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
  }

  // handles editing of a existing note
  // handles editing of a existing note
  async function handleEditNote(index) {
    if (editIndex !== null && editIndex === index) {
      // user is editing an existing note
      const quillEditorEdit = document.querySelector(
        ".individual-note .ql-editor"
      );
      const editorContentEdit = quillEditorEdit.textContent.trim();
      if (!editorContentEdit) {
        return;
      }

      // rate limit
      if (editorContentEdit.length > 2000) {
        alert("Max Character Limit of 2000 characters Crossed !");
        return;
      }

      // select the category
      const selectedCat =
        customCategory.trim() !== "" ? customCategory : selectedCategory;

      // setting up variables for sending them to the firestore with ease
      const noteId = notes[index].id; // use the index directly
      const updatedNote = {
        note: editingNote,
        category: selectedCat,
      };

      // update the note in firestore
      await updateDoc(doc(notesCollectionRef, noteId), updatedNote);

      // update the note in the local state
      const updatedNotes = [...notes];
      updatedNotes[index].note = editingNote;
      updatedNotes[index].category = selectedCat;
      setNotes(updatedNotes);

      // reset editIndex and editingNote
      setEditIndex(null);
      setEditingNote("");
      setIsEditing(false);
    } else {
      // user is trying to edit a new note
      setEditIndex(index);
      setEditingNote(notes[index].note);
      setIsEditing(true);

      // Set the newNote state as empty so that it doesn't overwrite the old note
      setNewNote("");

      // Update the selectedCategory state with the correct category of the note
      setSelectedCategory(notes[index].category);
    }
  }

  // add custom categories
  async function handleAddCategory() {
    // checks if the category field is empty and if the entered category already exists
    if (customCategory.trim() !== "" && !categories.includes(customCategory)) {
      if (customCategory.length > 10) {
        //rate limit
        alert("Custom category should be at most 10 characters long.");
        return;
      }
      // append old existing categories with the new one
      setCategories([...categories, customCategory]);
      // when the new category is created set the dropdown as this new category
      setSelectedCategory(customCategory);

      // add it to firestore
      await addDoc(categoriesCollectionRef, { name: customCategory });
    }
    // clear the <text> to allow user to enter a new custo mcategory
    setCustomCategory("");
  }

  // delete the category from firestore
  async function handleDeleteCategory() {
    if (selectedCategory !== "All") {
      // select the notes belonging to the custom category
      const notesToDelete = await getDocs(
        query(notesCollectionRef, where("category", "==", selectedCategory))
      );

      // if note exists then....
      if (notesToDelete.size !== 0) {
        // Delete each note from that category
        notesToDelete.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      // select the custom category you want to delete
      const categoryToDelete = await getDocs(
        query(categoriesCollectionRef, where("name", "==", selectedCategory))
      );

      // if category exists then
      if (categoryToDelete.size !== 0) {
        categoryToDelete.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      // updating local state for notes
      setNotes((prevNotes) =>
        prevNotes.filter((note) => note.category !== selectedCategory)
      );

      // remove category from local state
      const updatedCategories = categories.filter(
        (cat) => cat !== selectedCategory
      );
      setCategories(updatedCategories);
      setSelectedCategory("All");
    }
  }

  // quill.js toolbar utilties
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ font: [] }],
      [{ color: [] }],
      [{ background: [] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "code-block"],
    ],
  };

  const quillFormats = [
    "header",
    "font",
    "bold",
    "color",
    "background",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "link",
    "code-block",
  ];
  // render
  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        setNoteIds={setNoteIds}
        setUserUID={setUserUID}
      />
      {isLoggedIn && (
        <div className="note-app">
          {/* quill.js note-form */}
          <div className="note-form">
            <ReactQuill
              className="text-input quill-container"
              value={newNote}
              onChange={(value) => setNewNote(value)}
              placeholder="Enter your note..."
              modules={quillModules}
              formats={quillFormats}
            />

            {/* All the utlities which u can use under the quill.js textarea */}
            <div className="notes-utility">
              <div className="search-container">
                <p>Search for notes: </p>
                <input
                  className="search-bar"
                  placeholder="Type Something..."
                  value={searchInput}
                  onChange={handleSearchInputChange}
                ></input>
              </div>
              <p className="remaining-length">Length: {2000 - textLength}</p>
              <div className="category-container">
                <p>Select Category:</p>
                <select
                  className="select-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button
                  className="delete-cat-button"
                  onClick={handleDeleteCategory}
                  title="Delete Category"
                >
                  <FontAwesomeIcon
                    icon={faTrash}
                    className="icons"
                    disabled={isEditing}
                  />
                </button>
                <div className="custom-category-container">
                  <input
                    className="category-input"
                    type="text"
                    placeholder="Enter custom category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                  <button
                    className="add-cat-note add-new-cat"
                    onClick={handleAddCategory}
                    title="Add New Category"
                  >
                    <FontAwesomeIcon icon={faFolderPlus} className="icons" />
                  </button>
                </div>
              </div>
              <button
                className="add-cat-note add-new-note"
                onClick={handleAddNote}
                title="Add New Note"
              >
                <FontAwesomeIcon icon={faCirclePlus} className="icons" />
              </button>
            </div>
          </div>
          {/* the note-list */}
          <ul className="note-list">
            {filteredNotes.map((noteItem, index) => (
              <li key={index} className="individual-note">
                {editIndex === index ? (
                  <ReactQuill
                    className="editing-text-input"
                    value={editingNote}
                    onChange={(value) => setEditingNote(value)}
                    modules={quillModules}
                    formats={quillFormats}
                  />
                ) : (
                  <div
                    className="note-text"
                    dangerouslySetInnerHTML={{ __html: noteItem.note }} // this needs to be done to set Quill.js text on the webpage (StackOverflow)
                  />
                )}
                <div className="edit-delete-buttons">
                  <div className="note-time">{noteItem.time}</div>
                  <button
                    className="edit-button"
                    onClick={() => handleEditNote(index)}
                  >
                    {editIndex === index ? (
                      <FontAwesomeIcon icon={faSave} className="icons" />
                    ) : (
                      <FontAwesomeIcon icon={faEdit} className="icons" />
                    )}
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteNote(noteItem.id)}
                    disabled={isEditing}
                  >
                    <FontAwesomeIcon icon={faTrash} className="icons" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
export default NoteApp;
