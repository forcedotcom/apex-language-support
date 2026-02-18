global class ExampleIDLApiFamily {
	global Object clone() { }
	global static ConnectApi.ExampleDinosaurOutputRepresentation createAbstract(ConnectApi.ExampleDinosaurInputRepresentation exampleDinosaurInputRepresentation) { }
	global static ConnectApi.ExampleDataOutputRepresentation createExampleData(ConnectApi.ExampleIDLInputRepresentation exampleIDLInputRepresentation) { }
	global static ConnectApi.ExampleDinosaurOutputRepresentation getAbstract() { }
	global static ConnectApi.ExampleIDLCollectionRepresentation getExampleDataMethod(Integer numOfItem) { }

}