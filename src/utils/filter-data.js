// eslint-disable-next-line import/prefer-default-export
export const getListOfObjectWhereKeyContainsString = (listOfObjects, key, stringToSearchFor) => {
  const filteredList = listOfObjects.filter((object) => {
    const objectKey = object[key];
    return objectKey.includes(stringToSearchFor);
  });
  return filteredList;
};
