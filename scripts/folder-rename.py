import os

def list_folders():
    folders = [folder for folder in os.listdir('.') if os.path.isdir(folder)]
    return folders

def scan_folder(folder):
    files = []
    subfolders = []
    for item in os.listdir(folder):
        item_path = os.path.join(folder, item)
        if os.path.isfile(item_path):
            files.append(item)
        elif os.path.isdir(item_path):
            subfolders.append(item)
    return files, subfolders

def rename_folder(folder, new_name):
    os.rename(folder, new_name)

def rename_folders(folders, new_names):
    folders_not_renamed = []
    for folder, new_name in zip(folders, new_names):
        if folder != new_name and not os.path.exists(new_name):
            try:
                rename_folder(folder, new_name)
            except OSError:
                folders_not_renamed.append(folder)
        else:
            folders_not_renamed.append(folder)
    return folders_not_renamed

def show_rename_list(folders, new_names):
    print("Renaming List:")
    for i, (folder, new_name) in enumerate(zip(folders, new_names)):
        print(f"{i+1}. {folder} -> {new_name}")
    print("End")

def select_new_name(folder, subfolders, files):
    options = subfolders + files
    print(f"\nRenaming folder: {folder}")
    print("Options:")
    for i, option in enumerate(options):
        print(f"{i+1}. {option}")
    prompt_message = f"Choose a new name for folder '{folder}' (Enter the number): "

    while True:
        choice = input(prompt_message)
        if choice.isdigit() and 1 <= int(choice) <= len(options):
            choice_index = int(choice) - 1
            new_name = os.path.splitext(options[choice_index])[0]  # Remove file extension

            if new_name == folder:
                print("New name is the same as the original name. Skipping renaming for this folder.")
                return folder

            if new_name in options:
                counter = 1
                while True:
                    conflict_name = f"{new_name} ({counter})"
                    if conflict_name not in options:
                        new_name = conflict_name
                        break
                    counter += 1
                print(f"Duplicate name detected. Renaming folder '{folder}' to '{new_name}'.")
            return new_name
        else:
            prompt_retry_message = "Invalid choice. Retry input? (y/n): "
            retry_choice = input(prompt_retry_message)
            if retry_choice.lower() != 'y':
                print("Skipping renaming for this folder.")
                return folder

def select_new_names(folders, folder_contents):
    new_names = []
    for folder in folders:
        files = folder_contents[folder]['files']
        subfolders = folder_contents[folder]['subfolders']
        new_name = select_new_name(folder, subfolders, files)
        new_names.append(new_name)
    return new_names

def confirm_rename(folders, new_names):
    print("Previous Selections:")
    show_rename_list(folders, new_names)
    prompt_message = "Are you sure you want to rename all these folders with the new names as listed above? (y/n): "
    choice = input(prompt_message)
    return choice.lower() == 'y'

def pause_script():
    input("Press any key to exit...")

# Step 0: List folders in the current directory
print("Folders in the current directory:")
folders = list_folders()
for i, folder in enumerate(folders):
    print(f"{i+1}. {folder}")

# Step 1: Scan inside the folders and list files/subfolders
folder_contents = {}
for folder in folders:
    files, subfolders = scan_folder(folder)
    folder_contents[folder] = {'files': files, 'subfolders': subfolders}

# Step 2: Select new names interactively
new_names = select_new_names(folders, folder_contents)

# Step 3: Confirm renaming
if confirm_rename(folders, new_names):
    # Step 4: Rename all folders in the current directory
    folders_not_renamed = rename_folders(folders, new_names)

    # Step 5: Show the final renaming list
    show_rename_list(folders, new_names)

    # Step 6: Report if there are folders not renamed
    if folders_not_renamed:
        print("\nFolders not renamed:")
        for folder in folders_not_renamed:
            print(folder)
    else:
        print("\nAll folders renamed successfully.")
else:
    print("Renaming canceled.")

# Step 7: End - pause the script
pause_script()