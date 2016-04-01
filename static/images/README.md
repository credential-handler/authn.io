authorization.io Icons
======================

Files
-----

* authorization-io-logo.{svg,-#.png}: rectangular logo

Building
--------

To create the icons from SVG:

    $ make

To clean up old pngs:

    $ make clean

To create multi-size ../favicon.ico:

    $ make
    # open largest authorization-io-logo-64.png with GIMP
    # go to File > Open as Layers...
    # select the 32 and 16 files
    # export to favicon.ico

Fonts
-----

* "A" is Bitstream Vera Sans with Bold style.

Editing
-------

If you use Inkscape to edit the SVGs, you may want to check if your
saved files have Inkscape cruft in them. You can clean things up with:

    $ inkscape --export-plain-svg=output.svg input.svg

ChangeLog
---------

* 2016:
  * Created.
