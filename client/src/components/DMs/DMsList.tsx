/* eslint-disable no-use-before-define */
import { useState, useEffect } from 'react';
import axios from 'axios';

function DMsList() {
  const [dmsList, setDmsList] = useState([]);

  const findDms = async () => {
    try {
      const { data } = await axios.get('/dms');
      setDmsList(data);
    } catch (err) {
      console.error('Failed to retrieve DMs from server:', err);
    }
  };

  useEffect(() => {
    findDms();
  }, []);

  return (
    dmsList.length
      ? 'dms go here' // dmsList.map((dmInstance) => <DMsListItem dm={dmInstance} key={dmInstance.id} />)
      : 'No DMs open!'
  );
}

// function DMsListItem() { // would take a dm prop
//   // console.log(dm);
//   return <div>hi!</div>;
// }

export default DMsList;
