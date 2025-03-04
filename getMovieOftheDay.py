import os
import dropbox
from dropbox.exceptions import AuthError
import requests
from dotenv import load_dotenv
import datetime
import shutil

def clear_local_folder(local_folder):
    """
    Removes all files and directories in the given local_folder.
    """
    for filename in os.listdir(local_folder):
        file_path = os.path.join(local_folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)  # Remove a file or link
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)  # Remove a directory and its contents
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")

def refresh_access_token(app_key, app_secret, refresh_token):
    url = "https://api.dropboxapi.com/oauth2/token"
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": app_key,
        "client_secret": app_secret,
    }
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception("Failed to refresh access token: {}".format(response.content))

def download_from_dropbox(dbx, dropbox_path, local_path, target_folder):
    """
    Downloads only the file or folder from dropbox_path that has the name equal to target_folder.
    If it is a folder, downloads its entire contents recursively.
    
    Parameters:
      dbx           : Dropbox client instance.
      dropbox_path  : The path in Dropbox where the target folder/file is located.
      local_path    : The local directory where the target folder/file should be saved.
      target_folder : The name of the folder (or file) to download (e.g., current_date).
    """
    try:
        # Ensure the local directory exists
        if os.path.exists(local_path):
            clear_local_folder(local_download_path)
        else:
            os.makedirs(local_path)

        # List the contents of the Dropbox folder
        response = dbx.files_list_folder(dropbox_path)

        for entry in response.entries:
            if entry.name == target_folder:
                print('a')
                # Build the local path for the target
                local_entry_path = os.path.join(local_path, entry.name)

                if isinstance(entry, dropbox.files.FileMetadata):
                    # Download the file
                    with open(local_entry_path, "wb") as f:
                        metadata, res = dbx.files_download(entry.path_lower)
                        f.write(res.content)
                    print(f"Downloaded file: {entry.path_lower} to {local_entry_path}")

                elif isinstance(entry, dropbox.files.FolderMetadata):
                    # Recursively download the folder's contents
                    download_folder_contents(dbx, entry.path_lower, local_entry_path)
                    print(f"Downloaded folder: {entry.path_lower} to {local_entry_path}")
                return  # Exit after downloading the target entry

        print(f"No folder or file named '{target_folder}' found in {dropbox_path}")

    except AuthError as err:
        print(f"Authentication error: {err}")
    except Exception as e:
        print(f"Error: {e}")

def download_folder_contents(dbx, dropbox_folder_path, local_path):
    """
    Recursively downloads all files and subfolders from a Dropbox folder.
    
    Parameters:
      dbx                : Dropbox client instance.
      dropbox_folder_path: The path of the Dropbox folder to download.
      local_path         : The local directory to save the folder contents.
    """
    if not os.path.exists(local_path):
        os.makedirs(local_path)
    
    response = dbx.files_list_folder(dropbox_folder_path)
    
    for entry in response.entries:
        local_entry_path = os.path.join(local_path, entry.name)
        if isinstance(entry, dropbox.files.FileMetadata):
            with open(local_entry_path, "wb") as f:
                metadata, res = dbx.files_download(entry.path_lower)
                f.write(res.content)
            print(f"Downloaded file: {entry.path_lower} to {local_entry_path}")
        elif isinstance(entry, dropbox.files.FolderMetadata):
            download_folder_contents(dbx, entry.path_lower, local_entry_path)
        else:
            print(f"Skipping unsupported entry: {entry.name}")

load_dotenv()
app_key = os.getenv('DROPBOX_APP_KEY')
app_secret = os.getenv('DROPBOX_APP_SECRET')
refresh_token = os.getenv('DROPBOX_REFRESH_TOKEN')
access_token = refresh_access_token(app_key, app_secret, refresh_token)
dbx = dropbox.Dropbox(access_token)

# Define Dropbox and local paths
dropbox_folder_path = "/movies"
local_download_path = "./movie"
current_date = str(datetime.datetime.now().date())

# Start the download process
download_from_dropbox(dbx, dropbox_folder_path, local_download_path, current_date)