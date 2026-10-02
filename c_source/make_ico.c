/**
 * Generates an authentic Windows icon file (tabmaster.ico)
 * containing 16x16, 32x32, and 48x48 RGBA bitmap layers.
 * Run once to generate tabmaster.ico.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#pragma pack(push, 2)
typedef struct {
    unsigned short idReserved;
    unsigned short idType;
    unsigned short idCount;
} ICONHEADER;

typedef struct {
    unsigned char  bWidth;
    unsigned char  bHeight;
    unsigned char  bColorCount;
    unsigned char  bReserved;
    unsigned short wPlanes;
    unsigned short wBitCount;
    unsigned int   dwBytesInRes;
    unsigned int   dwImageOffset;
} ICONDIRENTRY;

typedef struct {
    unsigned int   biSize;
    int            biWidth;
    int            biHeight;
    unsigned short biPlanes;
    unsigned short biBitCount;
    unsigned int   biCompression;
    unsigned int   biSizeImage;
    int            biXPelsPerMeter;
    int            biYPelsPerMeter;
    unsigned int   biClrUsed;
    unsigned int   biClrImportant;
} BITMAPINFOHEADER;
#pragma pack(pop)

static void write_icon_layer(FILE* f, int size) {
    BITMAPINFOHEADER bih;
    memset(&bih, 0, sizeof(bih));
    bih.biSize = sizeof(BITMAPINFOHEADER);
    bih.biWidth = size;
    bih.biHeight = size * 2; /* In ICO format, height is doubled (XOR + AND masks) */
    bih.biPlanes = 1;
    bih.biBitCount = 32;     /* 32-bit BGRA */
    bih.biSizeImage = size * size * 4;

    fwrite(&bih, 1, sizeof(bih), f);

    /* Generate BGRA pixel grid (Dark modern slate with cyan/blue window accent) */
    for (int y = 0; y < size; y++) {
        for (int x = 0; x < size; x++) {
            unsigned char b = 0, g = 0, r = 0, a = 0;
            
            /* Border */
            if (x == 0 || x == size - 1 || y == 0 || y == size - 1) {
                b = 70; g = 70; r = 70; a = 255;
            }
            /* Window 1 (Top Left) */
            else if (x >= 2 && x <= size/2 && y >= size/3 && y <= size - 3) {
                b = 215; g = 120; r = 0; a = 255; /* Blue Accent #0078D7 */
            }
            /* Window 2 (Center Right) */
            else if (x >= size/3 + 1 && x <= size - 3 && y >= 2 && y <= size * 2/3) {
                b = 40; g = 40; r = 40; a = 255; /* Dark background */
                if (x == size/3 + 1 || x == size - 3 || y == 2 || y == size * 2/3) {
                    b = 100; g = 100; r = 100; a = 255;
                }
            }
            else {
                b = 24; g = 24; r = 24; a = 240;
            }

            fputc(b, f);
            fputc(g, f);
            fputc(r, f);
            fputc(a, f);
        }
    }

    /* 1-bit AND mask (all zeros for 32-bit alpha) */
    int maskRowSize = ((size + 31) / 32) * 4;
    for (int y = 0; y < size; y++) {
        for (int i = 0; i < maskRowSize; i++) {
            fputc(0, f);
        }
    }
}

int main(void) {
    FILE* f = fopen("tabmaster.ico", "wb");
    if (!f) {
        printf("Failed to create tabmaster.ico\n");
        return 1;
    }

    ICONHEADER header = { 0, 1, 3 }; /* 3 sizes: 16x16, 32x32, 48x48 */
    fwrite(&header, 1, sizeof(header), f);

    int sizes[3] = { 16, 32, 48 };
    int offset = sizeof(ICONHEADER) + 3 * sizeof(ICONDIRENTRY);

    for (int i = 0; i < 3; i++) {
        int s = sizes[i];
        int maskSize = ((s + 31) / 32) * 4 * s;
        int imgBytes = sizeof(BITMAPINFOHEADER) + (s * s * 4) + maskSize;

        ICONDIRENTRY entry;
        entry.bWidth = (unsigned char)s;
        entry.bHeight = (unsigned char)s;
        entry.bColorCount = 0;
        entry.bReserved = 0;
        entry.wPlanes = 1;
        entry.wBitCount = 32;
        entry.dwBytesInRes = imgBytes;
        entry.dwImageOffset = offset;

        fwrite(&entry, 1, sizeof(entry), f);
        offset += imgBytes;
    }

    for (int i = 0; i < 3; i++) {
        write_icon_layer(f, sizes[i]);
    }

    fclose(f);
    printf("Successfully created tabmaster.ico\n");
    return 0;
}
