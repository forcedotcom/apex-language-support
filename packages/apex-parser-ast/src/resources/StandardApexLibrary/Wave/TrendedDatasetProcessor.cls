global interface TrendedDatasetProcessor {
    virtual Boolean equals(Object arg0);

    abstract String getDescription();

    abstract String getLabel();

    virtual Integer hashCode();

    abstract void processTrendedDataset(Id datasetId, Id datasetVersionId);

    virtual String toString();
}