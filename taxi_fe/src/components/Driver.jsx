import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import socket from '../services/taxi_socket';
import { Card, CardContent, Typography } from '@mui/material';

function Customer(props) {
  let [message, setMessage] = useState();
  let [bookingId, setBookingId] = useState();
  let [visible, setVisible] = useState(false);

  useEffect(() => {
    const channel = socket.channel("customer:" + props.username, {});
    
    channel.on("booking_request", data => {
      console.log("CUSTOMER RECEIVED:", data);
      setMessage(data.msg);
      if (data.bookingId) {
        setBookingId(data.bookingId);
      }
      setVisible(true);
    });

    channel.join();

    return () => {
      channel.leave();
    };
  }, [props.username]);

  const cancelBooking = () => {
    if (!bookingId) return;
    fetch(`http://localhost:4000/api/bookings/${bookingId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'cancel', username: props.username})
    }).then(resp => {
      setMessage("Cancelación enviada.");
    });
  };

  return (
    <div style={{textAlign: "center", borderStyle: "solid"}}>
      Customer: {props.username}
      <div style={{backgroundColor: "lavender", minHeight: "120px", padding: "10px"}}>
        {visible && (
          <Card variant="outlined" style={{margin: "auto", width: "600px"}}>
            <CardContent>
              <Typography>{message}</Typography>
            </CardContent>
            {bookingId && (
              <Button onClick={cancelBooking} variant="outlined" color="error">
                Cancelar viaje
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default Customer;
