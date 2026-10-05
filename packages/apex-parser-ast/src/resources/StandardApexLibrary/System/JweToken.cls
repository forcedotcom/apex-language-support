global class JweToken {
    global JweToken(String alg, String enc, Blob epk, Blob encrypted_key, Blob iv, Blob ciphertext, Blob tag, Blob aad) { }

    global virtual Boolean equals(Object o) { return false; }

    global Blob getAad() { return null; }

    global String getAlgorithm() { return null; }

    global Blob getCiphertext() { return null; }

    global Blob getEncryptedKey() { return null; }

    global String getEncryptionAlgorithm() { return null; }

    global Blob getEphemeralPublicKey() { return null; }

    global Blob getIv() { return null; }

    global Blob getTag() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }
}