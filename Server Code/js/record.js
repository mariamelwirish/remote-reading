
const recordButton = document.getElementById("record");
recordButton.addEventListener("click", startRecording);
const stopButton = document.getElementById("stop");
stopButton.addEventListener("click", stopRecording);
const pauseButton = document.getElementById("pause");
pauseButton.addEventListener("click", pauseRecording);
const soundClips = document.querySelector('.sound-clips');



console.log(record);
let mediaRecorder;      //MediaRecorder Stream
let gumStream;
let recorderjsObject;   //Recorder.js Object
let input;              


function startRecording() {
    //get browser permission and check if browser is compatible
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("getUserMedia supported");
        navigator.mediaDevices
            .getUserMedia(
                {
                    audio: true,
                }
            )
        
        //successfully got permission
        .then((stream) => {
            recordButton.setAttribute("disabled",true);
            stopButton.removeAttribute("disabled");
            pauseButton.removeAttribute("disabled");
           
            audioContext = new AudioContext();
           gumStream = stream;
           input = audioContext.createMediaStreamSource(stream);
           recorderjsObject = new Recorder(input,{numChannels:1});
           recorderjsObject.record();

        })
    
        //error
        .catch(function(err) {
            
        });
    }
    else {
        console.log("This application not supported on your broswer!");
    }


}
//pause recording
function pauseRecording() {
    if (recorderjsObject.recording) {
        recorderjsObject.stop();
        pauseButton.innerHTML="RESUME";
    }

    else {
        recorderjsObject.record()
        pauseButton.innerHTML="PAUSE"
    }

}
//stop recording and export .wav file
function stopRecording() {

    //mediaRecorder.stop();
    recordButton.removeAttribute("disabled");
    stopButton.setAttribute("disabled",true);
    pauseButton.setAttribute("disabled",true);
    recorderjsObject.stop();

    
    
    console.log("recorder stopped");
    gumStream.getAudioTracks()[0].stop();

    recorderjsObject.exportWAV(createDownloadLink);

    
    
}


function createDownloadLink(audioBlob) {
    const i_id = infant_id;
    const audioURL = URL.createObjectURL(audioBlob);
    const aud = document.createElement('audio');
    const li = document.createElement('li');
    const link = document.createElement('a');
    const dateCreated = new Date()
    const fileName = dateCreated.toISOString();
    const br = document.createElement('br');
    aud.controls = true;
    aud.src = audioURL;

    link.href = audioURL;
    link.download = fileName+".wav";
    link.innerHTML = "Save";

    li.appendChild(aud);
    li.appendChild(document.createElement("br"));
    li.appendChild(document.createTextNode(fileName+".wav "));
    li.appendChild(link);
    

    //send to db
    const sendRecording = document.createElement('a');
    sendRecording.href='#';
    sendRecording.innerHTML="Send";
    //Event listener for the "Send" button
    sendRecording.addEventListener("click",function(event) {
        event.preventDefault();
        //Bring up modal for the audio name and message box after clicking send
        $("#exampleModal").modal("show");
        const sendAll = document.getElementById('sendinfo');
        //Event listener for the send message button of the modal
        sendAll.addEventListener("click", function(event) {
            event.preventDefault();
            const recordingName = document.getElementById('recording-name').value;
            //get values inputted into modal message box
            const recordingMessage = document.getElementById('recording-message').value;
            const scheduled_time = document.getElementById('datetime-input').value;
            //check if values are not empty
            if(recordingName.trim() === '' || recordingMessage.trim() === '') {
                alert("Please enter a name and message for the recording.");
                return;
            }
            //new form to send data to php file
            const formData = new FormData();
            //add modal text and blob to form
            formData.append('recording-name', recordingName);
            formData.append('recording-message', recordingMessage);
            formData.append('datetime-input', scheduled_time);
            formData.append("audio_blob",audioBlob,fileName);
            formData.append('infant_id', i_id);
            //send form to sendblob.php file
            const xhr = new XMLHttpRequest();
            xhr.onload=function(e) {
                if(this.readyState == 4) {
                    console.log("Server returned: ", e.target.responseText);
                }
            };
            
            xhr.open("POST", "sendblob.php", true);
            xhr.send(formData);

            $('#exampleModal').modal('hide');
        });
         
    });
    li.appendChild(document.createTextNode("  "));
    li.appendChild(sendRecording);
    li.appendChild(document.createElement("br"));
    soundClips.appendChild(li);
}

//function to update recording status in database when played
//send to mark_as_played.php
//called from get-recordings.php
function markAsPlayed(recordingId, infant_id, datePlayed) {
    
    
    const formData = new FormData();
    formData.append("recording_id", recordingId);
    formData.append("infant_id", infant_id);
    console.log(recordingId, infant_id);
    const xhttp = new XMLHttpRequest();
    xhttp.open("POST", "mark_as_played.php", true);
    //xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(formData);
    
}
  

//function to delete a recording from the nurses side
function deleteRecording(recordingId) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'delete-recording.php');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
      if (xhr.status === 200) {
        console.log(xhr.responseText); // response from server
        const newCardElement = document.getElementById(`new-recording-card-${recordingId}`);
        const oldCardElement = document.getElementById(`old-recording-card-${recordingId}`);
        if (newCardElement) {
          newCardElement.remove(); // remove the card element from the DOM
        }
        if (oldCardElement) {
            oldCardElement.remove();
        }
      }
    };
    xhr.send("recording_id=" + recordingId);  
  }
  


function scheduleRecording(recordingId, infant_id, requestedTime) {
    console.log("TEST");
    console.log(infant_id);
    let scheduled_time;

    if(requestedTime) {
        console.log("REWQUSTED", requestedTime);
        console.log("first");
        scheduled_time = requestedTime;
        const check_time = new Date(scheduled_time);
        const current_time = new Date();
        if(check_time.getTime() <= current_time.getTime()) {
            alert("The scheduled time has already passed!");
            return;
        }
        else {
            //new form to send data to php file
            const formData = new FormData();
            //add modal text and blob to form
            formData.append('recording_id', recordingId);
            formData.append('scheduled_time', scheduled_time);
            formData.append('infant_id', infant_id);
            //send form to sendblob.php file
            const xhs = new XMLHttpRequest();
            xhs.onload=function(e) {
                if(this.readyState == 4) {
                    console.log("Server returned: ", e.target.responseText);
                    const newRecordingCard = document.getElementById(`new-recording-card-${recordingId}`);
                    if (newRecordingCard) {
                        newRecordingCard.remove();
                    }
                }
            };
            xhs.open("POST", "schedule-recording.php", true);
            xhs.send(formData);
        }
    }

    else {
        //Bring up modal for scheduling a recording
        $("#scheduleModal").modal("show");
        console.log(requestedTime);
        console.log("else");
        const sendschedule = document.getElementById('sendschedule');

        //Event listener for the schedule button of the modal
        sendschedule.addEventListener("click", function(event) {
            event.preventDefault();
            
            //get values inputted into modal message box
            scheduled_time = document.getElementById('datetime-schedule').value;
            const check_time = new Date(scheduled_time);
            const current_time = new Date();
            //check if values are not empty
            if(scheduled_time.trim() === '') {
                alert("Please enter a date and time for the recording.");
                return;
            }
            if(check_time.getTime() <= current_time.getTime()) {
                alert("Please select a time in the future");
                return;
            }
            
            $('#scheduleModal').modal('hide');

            //new form to send data to php file
            const formData = new FormData();
            //add modal text and blob to form
            formData.append('recording_id', recordingId);
            formData.append('scheduled_time', scheduled_time);
            formData.append('infant_id', infant_id);
            //send form to sendblob.php file
            const xhs = new XMLHttpRequest();
            xhs.onload=function(e) {
                if(this.readyState == 4) {
                    console.log("Server returned: ", e.target.responseText);
                    const newRecordingCard = document.getElementById(`new-recording-card-${recordingId}`);
                    if (newRecordingCard) {
                        newRecordingCard.remove();
                    }
                }
            };
            xhs.open("POST", "schedule-recording.php", true);
            xhs.send(formData);
        });
    }
        
}

function rescheduleRecording(recordingId, infant_id, requestedTime) {
    $("#scheduleModal").modal("show");
        console.log(recordingId);
        console.log(requestedTime);
        console.log("else");
        const sendschedule = document.getElementById('sendschedule');
    
    //Event listener for the schedule button of the modal
    sendschedule.addEventListener("click", function(event) {
        event.preventDefault();
        
        //get values inputted into modal message box
        scheduled_time = document.getElementById('datetime-schedule').value;
        console.log(scheduled_time);
        const check_time = new Date(scheduled_time);
        const current_time = new Date();
        //check if values are not empty
        if(scheduled_time.trim() === '') {
            alert("Please enter a date and time for the recording.");
            return;
        }
        if(check_time.getTime() <= current_time.getTime()) {
            alert("Please select a time in the future");
            return;
        }
        
        $('#scheduleModal').modal('hide');

        //new form to send data to php file
        const formData = new FormData();
        //add modal text and blob to form
        formData.append('recording_id', recordingId);
        formData.append('scheduled_time', scheduled_time);
        formData.append('infant_id', infant_id);
        //send form to sendblob.php file
        const xhs = new XMLHttpRequest();
        xhs.onload=function(e) {
            if(this.readyState == 4) {
                console.log("Server returned: ", e.target.responseText);
                const newRecordingCard = document.getElementById(`new-recording-card-${recordingId}`);
                if (newRecordingCard) {
                    newRecordingCard.remove();
                }
            }
        };
        xhs.open("POST", "reschedule-recording.php", true);
        xhs.send(formData);
    });
}
