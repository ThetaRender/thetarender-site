GALLERY PICTURES - how it works
1. Put the pictures in this folder (img/gallery), named  <id>_<A|B|C>_<caption>.jpg
   id = ex / in / ob / sk + number (ex = exterior, in = interior, ob = objects, sk = sketches); the number sets the order.
   A = original, B = day render, C = night render (optional). Example: ex5_A_Villa.jpg  ex5_B_Villa.jpg  ex5_C_Villa.jpg
   To show the NIGHT render first, name the night picture with N instead of C (e.g. ex5_N_Villa.jpg).
   The Day button then switches to the B picture.
   The text after the second underscore is the caption / credit. A number without a B picture is not shown.
2. captions.txt (optional): lines  id = caption  (e.g.  sk18 = Burnham & Root - Goudy House) replace the caption from the file names, so a caption can be corrected without renaming files.
   highlights.txt lists the ids for the Highlights tab, in order (e.g.  sk18, ex5, in4).
3. Upload to GitHub: manifest.json is rebuilt automatically (Actions tab > "Gallery manifest", about a minute).
4. Preview on the PC: in the thetarender-site folder run  py -3 tools/build_gallery_manifest.py  (it prints a report),
   then  py -3 -m http.server 8000  and open http://localhost:8000  (opening index.html by double-click does not work).
