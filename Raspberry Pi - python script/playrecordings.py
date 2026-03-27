import pygame
import paramiko
import mysql.connector
import time
import paho.mqtt.client as mqtt
import datetime
import pytz

#ssh into ec2 instance
hostname = ''
username = ''
keyfile = ''
remotefile = ''
local_file = '/home/mejiade/Desktop/recordings/'
def query_database():
    #connect to database
    cnx = mysql.connector.connect(user='',
                                  password='',
                                  host='',
                                  database='')

    #cursor to execute SQL query
    mycursor = cnx.cursor()

    last_query_time=datetime.datetime.now()
    formatted_time = last_query_time.strftime("%Y-%m-%d %H:%M:%S")
    print(formatted_time)
    if(cnx.is_connected):
        print("ALIVE")
    else:
        print("CONNECTION DEAD")

#query database for scheduled recordings

    sql = "SELECT recordings.recording_id, recording_name FROM recordings JOIN recording_schedule ON recordings.recording_id = recording_schedule.recording_id WHERE recording_schedule.scheduled_time <= %s AND TIMESTAMPDIFF(SECOND,recording_schedule.scheduled_time, %s) <= 5 AND recording_schedule.infant_id=1;"
    mycursor.execute(sql, (formatted_time, formatted_time))
    result = mycursor.fetchall()
    print(type(result), result)
    return result

#play all scheduled recordings
def play_recording(recordings):
    for recording in recordings:
        new_name = ''.join(recording[1]) + '.wav'
        pygame.mixer.init()
        pygame.mixer.music.load(local_file + new_name)
        pygame.mixer.music.play()

        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)

#get file from EC2 instance and save in local directory
def get_file(recordings):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname, username=username, key_filename=keyfile)
    sftp = ssh.open_sftp()
    for recording in recordings:
        filename = ''.join(recording[1]) + '.wav'
        print(remotefile + filename, local_file + filename)
        sftp.get(remotefile + filename, local_file + filename)
    sftp.close()
    
    
def main():
    while True:
        recordings = query_database()
        
        if len(recordings) > 0:
            get_file(recordings)
            play_recording(recordings)
        time.sleep(5)
  
  
if __name__ == '__main__':
    main()



