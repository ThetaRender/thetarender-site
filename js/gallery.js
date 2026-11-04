// ---------------------------------------------------------------
// GALLERY LIST. Edit this file to add, remove or reorder examples.
// One line per example, in the order they appear on the page:
//   before : picture of the original (model view, sketch, photo...)
//   after  : the THETA render
//   caption: short text under the slider (can be left empty: "")
// Optional: to offer several renders of the same view (for example Day and Night),
// replace  after: "..."  by  afters: [ { label: "Day", src: "..." }, { label: "Night", src: "..." } ]
// Buttons with these labels then appear under the slider. All images need the same size.
// Put the image files in the img/gallery folder.
// Any number of examples works. Keep a comma after every line.
// ---------------------------------------------------------------
window.THETA_GALLERY = [
  { before: "img/gallery/ex1_before.jpg", afters: [ { label: "Day", src: "img/gallery/ex1_after.jpg" }, { label: "Night", src: "img/gallery/ex1_night.jpg" } ], caption: "From a model view" },
  { before: "img/gallery/ex2_before.jpg", after: "img/gallery/ex2_after.jpg", caption: "From a SketchUp view" },
  { before: "img/gallery/ex3_before.jpg", after: "img/gallery/ex3_after.jpg", caption: "From any image file" }
];
