import React, { useEffect } from 'react';
import axios from 'axios';

import { useParams } from '../../context/RouterContext';

function DMs() {
  const { id } = useParams();

  const loadDm = async () => {
    try {
      const { data } = await axios.get(`/dms/${id}`);
      console.log(data);
    } catch (err) {
      console.error('Failed to GET DM info from server:', err);
    }
  };

  useEffect(() => {
    loadDm();
  }, []);

  /**
   * I want to send a request to render the DM with the passed ID
   * If it doesn't exist make a POST request that creates a DM then
   * sends back its ID, to render that instead
   */

  return <h1>DMs go here!</h1>;
}

export default DMs;
