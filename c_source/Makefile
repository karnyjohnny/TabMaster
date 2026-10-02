# ==============================================================================
# TabMaster - Makefile for w64devkit & MSYS2 GCC
# Target: Windows 7 (x64 / x86) on Core 2 Duo / GMA 4500MHD
# License: MIT
# ==============================================================================

CC64       ?= x86_64-w64-mingw32-gcc
CC32       ?= i686-w64-mingw32-gcc
WINDRES64  ?= x86_64-w64-mingw32-windres
WINDRES32  ?= i686-w64-mingw32-windres

ifeq ($(shell which x86_64-w64-mingw32-gcc 2>/dev/null),)
  CC64      := gcc
  WINDRES64 := windres
endif

ifeq ($(wildcard src/main.c),src/main.c)
  SRCDIR := src
else
  SRCDIR := .
endif

CFLAGS := -Os -s -Wall -Wextra -std=c99 -mwindows \
          -fno-ident -fno-asynchronous-unwind-tables \
          -ffunction-sections -fdata-sections \
          -I$(SRCDIR)

LDFLAGS := -Wl,--gc-sections -Wl,--subsystem,windows
LIBS := -luser32 -lgdi32 -lpsapi -ldwmapi -lkernel32 -lshell32 -ladvapi32

TARGET64 := tabmaster_x64.exe
TARGET32 := tabmaster_x86.exe
SRC      := $(SRCDIR)/main.c
RC_SRC   := $(SRCDIR)/resource.rc
HEADER   := $(SRCDIR)/tabmaster.h
MANIFEST := $(SRCDIR)/tabmaster.manifest

all: $(TARGET64)

# 64-bit Build (~28 KB executable)
$(TARGET64): $(SRC) $(HEADER) resource64.o
	$(CC64) $(CFLAGS) -o $@ $(SRC) resource64.o $(LDFLAGS) $(LIBS)
	@echo "[SUCCESS] Generated 64-bit binary: $(TARGET64)"

resource64.o: $(RC_SRC) $(MANIFEST)
	$(WINDRES64) -I$(SRCDIR) -O coff $(RC_SRC) -o $@

# 32-bit Build (~24 KB executable)
x86: $(TARGET32)

$(TARGET32): $(SRC) $(HEADER) resource32.o
	$(CC32) $(CFLAGS) -o $@ $(SRC) resource32.o $(LDFLAGS) $(LIBS)
	@echo "[SUCCESS] Generated 32-bit binary: $(TARGET32)"

resource32.o: $(RC_SRC) $(MANIFEST)
	$(WINDRES32) -I$(SRCDIR) -F pe-i386 -O coff $(RC_SRC) -o $@

clean:
	rm -f $(TARGET64) $(TARGET32) *.o

.PHONY: all x86 clean
