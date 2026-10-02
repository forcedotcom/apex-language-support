/**
 * Specifies the compression level for creating a zip file.
 * <p>Usage
 * Use Level enum with the getLevel() and setLevel(value) methods in the ZipWriter class.
 * <p>Enum Values
 * The following are the values of the Compression.Level enum.
 */
global enum Level {
    BEST_COMPRESSION,
    BEST_SPEED,
    DEFAULT_LEVEL,
    NO_COMPRESSION

}