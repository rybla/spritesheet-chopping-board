import { useState, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Flex,
  Box,
  NumberInput,
  TextInput,
  Card,
  Paper,
  ScrollArea,
  Badge,
  Alert,
  Select,
} from "@mantine/core";
import { fetchURL, encodePng, Image as ImageJS } from "image-js";
import { ZipWriter, BlobWriter, Uint8ArrayReader } from "@zip.js/zip.js";
import { ColorSchemeToggle } from "@/components/ColorSchemeToggle/ColorSchemeToggle";

// Beautiful SVG Icons
const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "var(--mantine-color-blue-filled)", opacity: 0.8 }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ResetIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const LinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const UnlinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18.84 12.2a4.4 4.4 0 0 0-5.17-.53l-.48.39" />
    <path d="M5.17 11.75a4.4 4.4 0 0 0 5.17.53l.48-.39" />
    <line x1="15" y1="9" x2="9" y2="15" />
  </svg>
);

interface Tile {
  id: string; // row_col
  row: number;
  col: number;
  defaultName: string;
}

export function HomePage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [jsImage, setJsImage] = useState<ImageJS | null>(null);

  // Settings state
  const [tileWidth, setTileWidth] = useState<number>(16);
  const [tileHeight, setTileHeight] = useState<number>(16);
  const [spacingX, setSpacingX] = useState<number>(1);
  const [spacingY, setSpacingY] = useState<number>(1);
  const [linkSize, setLinkSize] = useState<boolean>(true);
  const [linkSpacing, setLinkSpacing] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(4);

  // Interaction state
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});

  // Operation state
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Safeguards for size and spacing
  const safeTileWidth = Math.max(1, tileWidth);
  const safeTileHeight = Math.max(1, tileHeight);
  const safeSpacingX = Math.max(0, spacingX);
  const safeSpacingY = Math.max(0, spacingY);

  // Calculate cols and rows
  const cols = imageDimensions
    ? Math.max(
        0,
        Math.floor(
          (imageDimensions.width + safeSpacingX) /
            (safeTileWidth + safeSpacingX)
        )
      )
    : 0;
  const rows = imageDimensions
    ? Math.max(
        0,
        Math.floor(
          (imageDimensions.height + safeSpacingY) /
            (safeTileHeight + safeSpacingY)
        )
      )
    : 0;

  // Memoize tiles array
  const tiles = useMemo(() => {
    const list: Tile[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = `${r}_${c}`;
        list.push({
          id,
          row: r,
          col: c,
          defaultName: `tile_${r}_${c}`,
        });
      }
    }
    return list;
  }, [rows, cols]);

  // Clean selections if they go out of bounds on grid change - Handled in NumberInput change handlers

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;

      const img = document.createElement("img");
      img.src = src;
      img.onload = async () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        setImageSrc(src);
        setSelectedTileId(null);
        setEditingTileId(null);
        setCustomNames({});
        setError(null);

        try {
          const jsImg = await fetchURL(src);
          setJsImage(jsImg);
        } catch (err: unknown) {
          console.error("Failed to parse image with image-js:", err);
          setError(
            "Failed to load image structure. Please try a standard PNG, JPEG, or GIF."
          );
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSelectTile = (id: string) => {
    setSelectedTileId(id);
    setEditingTileId(id);

    // Scroll corresponding list element into view
    setTimeout(() => {
      const element = document.getElementById(`sidebar-tile-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 50);
  };

  const handleDownload = async () => {
    if (!jsImage || tiles.length === 0) return;

    try {
      setDownloading(true);
      setDownloadProgress(0);
      setError(null);

      const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
      const totalTiles = tiles.length;
      const usedNames = new Set<string>();

      for (let i = 0; i < totalTiles; i++) {
        const tile = tiles[i];
        if (!tile) continue;
        const tileId = tile.id;
        const tileName = customNames[tileId] || tile.defaultName;

        const x = tile.col * (safeTileWidth + safeSpacingX);
        const y = tile.row * (safeTileHeight + safeSpacingY);

        if (
          x + safeTileWidth <= jsImage.width &&
          y + safeTileHeight <= jsImage.height
        ) {
          const cropped = jsImage.crop({
            origin: { row: y, column: x },
            width: safeTileWidth,
            height: safeTileHeight,
          });

          const pngData = encodePng(cropped);

          let fileName = `${tileName}.png`;
          let counter = 1;
          while (usedNames.has(fileName.toLowerCase())) {
            fileName = `${tileName}_${counter}.png`;
            counter++;
          }
          usedNames.add(fileName.toLowerCase());

          await zipWriter.add(fileName, new Uint8ArrayReader(pngData));
        }

        setDownloadProgress(Math.round(((i + 1) / totalTiles) * 100));
      }

      const blob = await zipWriter.close();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "spritesheet_tiles.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("Download failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to slice and package tiles: ${errorMessage}`);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setImageDimensions(null);
    setJsImage(null);
    setSelectedTileId(null);
    setEditingTileId(null);
    setCustomNames({});
    setError(null);
  };

  return (
    <Container
      size="xl"
      py="lg"
      h="100vh"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Header Bar */}
      <Flex justify="space-between" align="center" mb="lg">
        <Stack gap={2}>
          <Group gap="xs">
            <Title order={2}>Spritesheet Chopping Board</Title>
            <Badge color="blue" size="sm" variant="light">
              Interactive Slicer
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Upload your spritesheet, configure grid settings, rename individual
            tiles, and download them as a ZIP bundle.
          </Text>
        </Stack>
        <ColorSchemeToggle />
      </Flex>

      {error && (
        <Alert
          color="red"
          title="An error occurred"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Main Area */}
      {!imageSrc ? (
        <Flex justify="center" align="center" style={{ flexGrow: 1 }}>
          <input
            type="file"
            accept="image/*"
            id="spritesheet-upload-input"
            style={{ display: "none" }}
            onChange={(e) => {
              void handleFileChange(e);
            }}
          />
          <Paper
            withBorder
            p="xl"
            radius="md"
            style={{
              width: "100%",
              maxWidth: 500,
              cursor: "pointer",
              borderStyle: "dashed",
              textAlign: "center",
              backgroundColor: "var(--mantine-color-default-hover)",
              transition: "transform 0.2s, border-color 0.2s",
            }}
            onClick={() =>
              document.getElementById("spritesheet-upload-input")?.click()
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.01)";
              e.currentTarget.style.borderColor =
                "var(--mantine-color-blue-filled)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.borderColor =
                "var(--mantine-color-default-border)";
            }}
          >
            <Stack align="center" gap="md" py="xl">
              <UploadIcon />
              <Stack gap={4}>
                <Text size="lg" fw={500}>
                  Upload Spritesheet Image
                </Text>
                <Text size="sm" c="dimmed">
                  Drag and drop or click to select image file (PNG, JPG, etc.)
                </Text>
              </Stack>
            </Stack>
          </Paper>
        </Flex>
      ) : (
        <Flex
          gap="md"
          align="stretch"
          h="calc(100vh - 120px)"
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {/* Sidebar */}
          <Paper
            withBorder
            p="md"
            radius="md"
            w={340}
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <Stack gap="md" style={{ height: "100%" }}>
              {/* Slicer Config */}
              <Card
                withBorder
                padding="sm"
                radius="md"
                style={{ flexShrink: 0 }}
              >
                <Text size="sm" fw={600} mb="xs">
                  Slicing Configuration
                </Text>
                <Stack gap="xs">
                  {/* Size Config */}
                  <Box>
                    {linkSize ? (
                      <Flex align="flex-end" gap="xs">
                        <NumberInput
                          label="Tile Size (px)"
                          value={tileWidth}
                          onChange={(val) => {
                            const n = Number(val) || 8;
                            setTileWidth(n);
                            setTileHeight(n);
                            setSelectedTileId(null);
                            setEditingTileId(null);
                          }}
                          min={1}
                          step={1}
                          size="xs"
                          style={{ flexGrow: 1 }}
                        />
                        <Button
                          variant="subtle"
                          color="blue"
                          onClick={() => setLinkSize(false)}
                          title="Unlink width and height"
                          styles={{ root: { padding: "0 6px", height: 30 } }}
                        >
                          <LinkIcon />
                        </Button>
                      </Flex>
                    ) : (
                      <Flex align="flex-end" gap="xs">
                        <Group gap="xs" style={{ flexGrow: 1 }} grow>
                          <NumberInput
                            label="Width (px)"
                            value={tileWidth}
                            onChange={(val) => {
                              setTileWidth(Number(val) || 8);
                              setSelectedTileId(null);
                              setEditingTileId(null);
                            }}
                            min={1}
                            step={1}
                            size="xs"
                          />
                          <NumberInput
                            label="Height (px)"
                            value={tileHeight}
                            onChange={(val) => {
                              setTileHeight(Number(val) || 8);
                              setSelectedTileId(null);
                              setEditingTileId(null);
                            }}
                            min={1}
                            step={1}
                            size="xs"
                          />
                        </Group>
                        <Button
                          variant="subtle"
                          color="gray"
                          onClick={() => {
                            setLinkSize(true);
                            setTileHeight(tileWidth);
                            setSelectedTileId(null);
                            setEditingTileId(null);
                          }}
                          title="Link width and height"
                          styles={{ root: { padding: "0 6px", height: 30 } }}
                        >
                          <UnlinkIcon />
                        </Button>
                      </Flex>
                    )}
                  </Box>

                  {/* Spacing Config */}
                  <Box>
                    {linkSpacing ? (
                      <Flex align="flex-end" gap="xs">
                        <NumberInput
                          label="Spacing (px)"
                          value={spacingX}
                          onChange={(val) => {
                            const n = Number(val) >= 0 ? Number(val) : 0;
                            setSpacingX(n);
                            setSpacingY(n);
                            setSelectedTileId(null);
                            setEditingTileId(null);
                          }}
                          min={0}
                          step={1}
                          size="xs"
                          style={{ flexGrow: 1 }}
                        />
                        <Button
                          variant="subtle"
                          color="blue"
                          onClick={() => setLinkSpacing(false)}
                          title="Unlink X and Y spacing"
                          styles={{ root: { padding: "0 6px", height: 30 } }}
                        >
                          <LinkIcon />
                        </Button>
                      </Flex>
                    ) : (
                      <Flex align="flex-end" gap="xs">
                        <Group gap="xs" style={{ flexGrow: 1 }} grow>
                          <NumberInput
                            label="Spacing X (px)"
                            value={spacingX}
                            onChange={(val) => {
                              setSpacingX(Number(val) >= 0 ? Number(val) : 0);
                              setSelectedTileId(null);
                              setEditingTileId(null);
                            }}
                            min={0}
                            step={1}
                            size="xs"
                          />
                          <NumberInput
                            label="Spacing Y (px)"
                            value={spacingY}
                            onChange={(val) => {
                              setSpacingY(Number(val) >= 0 ? Number(val) : 0);
                              setSelectedTileId(null);
                              setEditingTileId(null);
                            }}
                            min={0}
                            step={1}
                            size="xs"
                          />
                        </Group>
                        <Button
                          variant="subtle"
                          color="gray"
                          onClick={() => {
                            setLinkSpacing(true);
                            setSpacingY(spacingX);
                            setSelectedTileId(null);
                            setEditingTileId(null);
                          }}
                          title="Link X and Y spacing"
                          styles={{ root: { padding: "0 6px", height: 30 } }}
                        >
                          <UnlinkIcon />
                        </Button>
                      </Flex>
                    )}
                  </Box>

                  <Select
                    label="Preview Zoom"
                    value={String(zoom)}
                    onChange={(val) => setZoom(Number(val))}
                    data={[
                      { value: "1", label: "1x (Original size)" },
                      { value: "2", label: "2x" },
                      { value: "4", label: "4x" },
                      { value: "8", label: "8x" },
                      { value: "12", label: "12x" },
                      { value: "16", label: "16x" },
                    ]}
                    size="xs"
                  />
                </Stack>
              </Card>

              {/* Action Buttons */}
              <Stack gap="xs" style={{ flexShrink: 0 }}>
                <Button
                  onClick={() => {
                    void handleDownload();
                  }}
                  loading={downloading}
                  leftSection={!downloading && <DownloadIcon />}
                  fullWidth
                >
                  {downloading
                    ? `Exporting ZIP (${downloadProgress}%)`
                    : `Download Bundle (${tiles.length})`}
                </Button>

                <Button
                  variant="outline"
                  color="gray"
                  onClick={handleReset}
                  leftSection={<ResetIcon />}
                  size="xs"
                  fullWidth
                >
                  Reset / Upload New
                </Button>
              </Stack>

              {/* Tiles Scroll Area */}
              <Box
                style={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <Group justify="space-between" mb="xs" px="xs">
                  <Text size="xs" fw={700} c="dimmed">
                    GRID TILES ({tiles.length})
                  </Text>
                  {imageDimensions && (
                    <Text size="xs" c="dimmed">
                      {imageDimensions.width}x{imageDimensions.height} px
                    </Text>
                  )}
                </Group>

                <ScrollArea style={{ flexGrow: 1, minHeight: 0 }}>
                  <Stack gap="xs" pr="xs">
                    {tiles.map((tile) => {
                      const isSelected = selectedTileId === tile.id;
                      const isEditing = editingTileId === tile.id;
                      const customName = customNames[tile.id];
                      const tileName =
                        customName !== undefined
                          ? customName
                          : tile.defaultName;

                      // Thumbnail clipping calculation
                      const thumbnailScale =
                        24 / Math.max(safeTileWidth, safeTileHeight);
                      const bgSizeWidth = imageDimensions
                        ? imageDimensions.width * thumbnailScale
                        : 0;
                      const bgSizeHeight = imageDimensions
                        ? imageDimensions.height * thumbnailScale
                        : 0;
                      const bgPosX =
                        -tile.col *
                        (safeTileWidth + safeSpacingX) *
                        thumbnailScale;
                      const bgPosY =
                        -tile.row *
                        (safeTileHeight + safeSpacingY) *
                        thumbnailScale;

                      return (
                        <Paper
                          key={tile.id}
                          id={`sidebar-tile-${tile.id}`}
                          withBorder
                          p="xs"
                          radius="xs"
                          onClick={() => handleSelectTile(tile.id)}
                          style={{
                            cursor: "pointer",
                            borderColor: isSelected
                              ? "var(--mantine-color-blue-filled)"
                              : "var(--mantine-color-default-border)",
                            backgroundColor: isSelected
                              ? "var(--mantine-color-blue-light)"
                              : "transparent",
                            transition:
                              "background-color 0.1s, border-color 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "var(--mantine-color-default-hover)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }
                          }}
                        >
                          <Flex align="center" gap="xs">
                            {/* Clipped Thumbnail Preview */}
                            <Flex
                              align="center"
                              justify="center"
                              style={{
                                width: 24,
                                height: 24,
                                flexShrink: 0,
                                backgroundColor: "var(--mantine-color-body)",
                                border:
                                  "1px solid var(--mantine-color-default-border)",
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                style={{
                                  width: safeTileWidth * thumbnailScale,
                                  height: safeTileHeight * thumbnailScale,
                                  backgroundImage: `url(${imageSrc})`,
                                  backgroundPosition: `${bgPosX}px ${bgPosY}px`,
                                  backgroundSize: `${bgSizeWidth}px ${bgSizeHeight}px`,
                                  imageRendering: "pixelated",
                                }}
                              />
                            </Flex>

                            {/* Name or TextInput */}
                            <Box style={{ flexGrow: 1, minWidth: 0 }}>
                              {isEditing ? (
                                <TextInput
                                  size="xs"
                                  autoFocus
                                  value={tileName}
                                  onChange={(e) => {
                                    setCustomNames((prev) => ({
                                      ...prev,
                                      [tile.id]: e.target.value,
                                    }));
                                  }}
                                  onBlur={() => setEditingTileId(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  styles={{
                                    input: {
                                      height: 26,
                                      fontSize: 12,
                                      padding: "2px 6px",
                                    },
                                  }}
                                />
                              ) : (
                                <Text
                                  size="sm"
                                  truncate
                                  style={{ userSelect: "none" }}
                                >
                                  {tileName}
                                </Text>
                              )}
                            </Box>

                            {/* Coordinates Badge */}
                            <Badge variant="outline" size="xs" color="gray">
                              {tile.row},{tile.col}
                            </Badge>
                          </Flex>
                        </Paper>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              </Box>
            </Stack>
          </Paper>

          {/* Canvas Workspace */}
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
              backgroundColor: "var(--mantine-color-default-hover)",
              position: "relative",
            }}
          >
            {imageDimensions && (
              <Box
                style={{
                  position: "relative",
                  backgroundImage: `
                    linear-gradient(45deg, var(--mantine-color-default-border) 25%, transparent 25%),
                    linear-gradient(-45deg, var(--mantine-color-default-border) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, var(--mantine-color-default-border) 75%),
                    linear-gradient(-45deg, transparent 75%, var(--mantine-color-default-border) 75%)
                  `,
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                  backgroundColor: "var(--mantine-color-body)",
                  border: "2px solid var(--mantine-color-default-border)",
                  borderRadius: 4,
                  boxShadow: "var(--mantine-shadow-md)",
                  userSelect: "none",
                }}
              >
                {/* Spritesheet Render */}
                <img
                  src={imageSrc}
                  alt="Spritesheet Preview"
                  style={{
                    display: "block",
                    width: imageDimensions.width * zoom,
                    height: imageDimensions.height * zoom,
                    imageRendering: "pixelated",
                    pointerEvents: "none",
                  }}
                />

                {/* Grid Cells overlay */}
                {tiles.map((tile) => {
                  const isSelected = selectedTileId === tile.id;
                  const left = tile.col * (safeTileWidth + safeSpacingX) * zoom;
                  const top = tile.row * (safeTileHeight + safeSpacingY) * zoom;
                  const width = safeTileWidth * zoom;
                  const height = safeTileHeight * zoom;
                  const tileName = customNames[tile.id] || tile.defaultName;

                  return (
                    <Box
                      key={tile.id}
                      title={tileName}
                      onClick={() => handleSelectTile(tile.id)}
                      style={{
                        position: "absolute",
                        left,
                        top,
                        width,
                        height,
                        boxSizing: "border-box",
                        border: isSelected
                          ? "2px solid var(--mantine-color-blue-filled)"
                          : "1px solid rgba(255, 255, 255, 0.4)",
                        outline: isSelected
                          ? "1px solid white"
                          : "1px solid rgba(0, 0, 0, 0.2)",
                        backgroundColor: isSelected
                          ? "rgba(24, 100, 171, 0.15)"
                          : "transparent",
                        cursor: "pointer",
                        zIndex: isSelected ? 10 : 1,
                        transition: "border-color 0.1s, background-color 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor =
                            "rgba(255, 255, 255, 0.9)";
                          e.currentTarget.style.outlineColor =
                            "rgba(0, 0, 0, 0.6)";
                          e.currentTarget.style.backgroundColor =
                            "rgba(255, 255, 255, 0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor =
                            "rgba(255, 255, 255, 0.4)";
                          e.currentTarget.style.outlineColor =
                            "rgba(0, 0, 0, 0.2)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    />
                  );
                })}
              </Box>
            )}
          </Paper>
        </Flex>
      )}
    </Container>
  );
}
