# authorization.io icons

LOGO_NAME=authorization-io-logo
LOGO_SRC=$(LOGO_NAME).svg
LOGO_PNGS=\
	$(LOGO_NAME).png \
	$(LOGO_NAME)-64.png \
	$(LOGO_NAME)-32.png \
	$(LOGO_NAME)-16.png

all: $(LOGO_PNGS)

clean:
	$(RM) $(LOGO_PNGS)

$(LOGO_PNGS): $(LOGO_SRC)
	inkscape --export-width=64 --export-png=$(LOGO_NAME)-64.png $<
	inkscape --export-width=32 --export-png=$(LOGO_NAME)-32.png $<
	inkscape --export-width=16 --export-png=$(LOGO_NAME)-16.png $<
